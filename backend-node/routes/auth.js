import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "../config/database.js";

const router = express.Router();

// Debug middleware
router.use((req, res, next) => {
  console.log(`📨 Auth Route: ${req.method} ${req.path}`);
  next();
});

// Register new user
router.post("/register", async (req, res) => {
  try {
    const { username, password, securityAnswers } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: "Username and password are required",
      });
    }

    if (
      !securityAnswers ||
      !securityAnswers.answer1 ||
      !securityAnswers.answer2 ||
      !securityAnswers.answer3
    ) {
      return res.status(400).json({
        success: false,
        error: "All security answers are required",
      });
    }

    if (username.length < 3) {
      return res.status(400).json({
        success: false,
        error: "Username must be at least 3 characters",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: "Password must be at least 6 characters",
      });
    }

    // Check if username exists
    const [existing] = await pool.execute(
      "SELECT id FROM users WHERE username = ?",
      [username]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        error: "Username already exists",
      });
    }

    // Hash password and security answers (case-insensitive, trimmed)
    const hashedPassword = await bcrypt.hash(password, 10);
    const hashedAnswer1 = await bcrypt.hash(
      securityAnswers.answer1.toLowerCase().trim(),
      10
    );
    const hashedAnswer2 = await bcrypt.hash(
      securityAnswers.answer2.toLowerCase().trim(),
      10
    );
    const hashedAnswer3 = await bcrypt.hash(
      securityAnswers.answer3.toLowerCase().trim(),
      10
    );

    // Create user
    const [result] = await pool.execute(
      "INSERT INTO users (username, password_hash) VALUES (?, ?)",
      [username, hashedPassword]
    );

    const userId = result.insertId;

    // Store security answers
    await pool.execute(
      "INSERT INTO security_answers (user_id, question_1, answer_1_hash, question_2, answer_2_hash, question_3, answer_3_hash) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [
        userId,
        "What is your favorite color?",
        hashedAnswer1,
        "What is the name of your first pet?",
        hashedAnswer2,
        "In what city were you born?",
        hashedAnswer3,
      ]
    );

    console.log(`✅ User created: ${username} with security answers`);

    // Generate JWT token
    const jwtSecret =
      process.env.JWT_SECRET ||
      "mid-development-secret-key-change-in-production-2024";
    const token = jwt.sign({ userId, username }, jwtSecret, {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    });

    res.status(201).json({
      success: true,
      data: {
        token,
        user: {
          id: userId,
          username,
        },
      },
      message: "Account created successfully",
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to create account",
    });
  }
});

// Login
router.post("/login", async (req, res) => {
  try {
    console.log("📝 Login attempt received");
    console.log("Request body:", req.body);

    const { username, password } = req.body;

    if (!username || !password) {
      console.log("❌ Missing username or password");
      return res.status(400).json({
        success: false,
        error: "Username and password are required",
      });
    }

    console.log(`🔍 Looking for user: ${username}`);

    // Find user
    const [users] = await pool.execute(
      "SELECT id, username, password_hash FROM users WHERE username = ?",
      [username]
    );

    if (users.length === 0) {
      console.log(`❌ User not found: ${username}`);
      return res.status(401).json({
        success: false,
        error: "Invalid username or password",
      });
    }

    const user = users[0];
    console.log(`✅ User found: ${username}`);

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      console.log(`❌ Invalid password for user: ${username}`);
      return res.status(401).json({
        success: false,
        error: "Invalid username or password",
      });
    }

    console.log(`✅ Password valid for user: ${username}`);

    // Generate JWT token
    const jwtSecret =
      process.env.JWT_SECRET ||
      "mid-development-secret-key-change-in-production-2024";
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      jwtSecret,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );

    console.log(`✅ Token generated for user: ${username}`);

    // Track login attempt
    try {
      const ipAddress =
        req.headers["x-forwarded-for"] ||
        req.connection.remoteAddress ||
        "unknown";
      const userAgent = req.headers["user-agent"] || "unknown";

      // Check if login_track table exists and get count
      let loginCount = 0;
      try {
        const [countResult] = await pool.execute(
          "SELECT COUNT(*) as cnt FROM login_track WHERE user_id = ?",
          [user.id]
        );
        loginCount = countResult[0]?.cnt || 0;
        console.log(
          `DEBUG: User ${username} (ID: ${user.id}) has ${loginCount} previous logins`
        );
      } catch (queryError) {
        console.warn(
          `DEBUG: Could not query login_track: ${queryError.message}. Assuming first login.`
        );
        loginCount = 0;
      }

      const isFirstLogin = loginCount === 0;

      // Insert login record
      try {
        await pool.execute(
          "INSERT INTO login_track (user_id, ip_address, user_agent) VALUES (?, ?, ?)",
          [user.id, ipAddress, userAgent]
        );
        console.log(
          `✅ Login tracked for user: ${username} (ID: ${user.id}). IP: ${ipAddress}`
        );
      } catch (insertError) {
        console.error(
          `⚠️  Error inserting login record: ${insertError.message}`
        );
      }

      res.json({
        success: true,
        data: {
          token,
          user: {
            id: user.id,
            username: user.username,
          },
          isFirstLogin: isFirstLogin,
        },
        message: "Login successful",
      });
    } catch (trackError) {
      console.error("⚠️  Error tracking login:", trackError.message);
      // Still return success even if tracking fails
      res.json({
        success: true,
        data: {
          token,
          user: {
            id: user.id,
            username: user.username,
          },
          isFirstLogin: false, // Default to false if tracking fails
        },
        message: "Login successful",
      });
    }
  } catch (error) {
    console.error("❌ Login error:", error.message);
    res.status(500).json({
      success: false,
      error: "Failed to login",
    });
  }
});

// Verify token
router.get("/verify", async (req, res) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: "Token required",
      });
    }

    const jwtSecret =
      process.env.JWT_SECRET ||
      "mid-development-secret-key-change-in-production-2024";
    jwt.verify(token, jwtSecret, async (err, decoded) => {
      if (err) {
        return res.status(403).json({
          success: false,
          error: "Invalid or expired token",
        });
      }

      // Get fresh user data
      const [users] = await pool.execute(
        "SELECT id, username, created_at FROM users WHERE id = ?",
        [decoded.userId]
      );

      if (users.length === 0) {
        return res.status(404).json({
          success: false,
          error: "User not found",
        });
      }

      res.json({
        success: true,
        data: {
          user: users[0],
        },
      });
    });
  } catch (error) {
    console.error("Verify error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to verify token",
    });
  }
});

// Check if user is new (first time accessing system)
router.get("/is-new-user", async (req, res) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: "No token provided",
      });
    }

    const jwtSecret =
      process.env.JWT_SECRET ||
      "mid-development-secret-key-change-in-production-2024";

    jwt.verify(token, jwtSecret, async (err, decoded) => {
      if (err) {
        return res.status(403).json({
          success: false,
          error: "Invalid or expired token",
        });
      }

      try {
        // Get user creation date
        const [users] = await pool.execute(
          "SELECT id, created_at FROM users WHERE id = ?",
          [decoded.userId]
        );

        if (users.length === 0) {
          return res.status(404).json({
            success: false,
            error: "User not found",
          });
        }

        const user = users[0];

        // Check login count from login_track table
        let loginCount = 0;
        try {
          const [loginRecords] = await pool.execute(
            "SELECT COUNT(*) as cnt FROM login_track WHERE user_id = ?",
            [user.id]
          );
          loginCount = loginRecords[0]?.cnt || 0;
        } catch (queryError) {
          console.warn(
            `DEBUG: Error querying login_track: ${queryError.message}`
          );
          loginCount = 0;
        }

        const isNew = loginCount === 1; // First login if exactly 1 record exists
        console.log(
          `✅ isNewUser check - user_id: ${user.id}, loginCount: ${loginCount}, isNew: ${isNew}`
        );

        res.json({
          success: true,
          data: {
            isNew,
            loginCount,
            createdAt: user.created_at,
          },
        });
      } catch (dbError) {
        console.error("Database error:", dbError);
        res.status(500).json({
          success: false,
          error: "Failed to check user status",
        });
      }
    });
  } catch (error) {
    console.error("User status check error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to check user status",
    });
  }
});

// Verify username exists for password reset
router.post("/verify-username", async (req, res) => {
  try {
    const { username } = req.body;

    console.log(`Username verification attempt: ${username}`);

    // Validate input
    if (!username || username.length < 3) {
      return res.status(400).json({
        success: false,
        error: "Valid username is required",
      });
    }

    // Check if user exists
    const [users] = await pool.execute(
      "SELECT id FROM users WHERE username = ?",
      [username]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Username not found in database",
      });
    }

    console.log(`Username verified: ${username}`);

    res.json({
      success: true,
      message: "Username verified successfully",
      exists: true,
    });
  } catch (error) {
    console.error("Username verification error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to verify username",
    });
  }
});

// Verify security answers for password reset
router.post("/verify-security-answers", async (req, res) => {
  try {
    const { username, answer1, answer2, answer3 } = req.body;

    console.log(`Password reset attempt for username: ${username}`);

    // Validate input
    if (!username || !answer1 || !answer2 || !answer3) {
      return res.status(400).json({
        success: false,
        error: "Username and all three answers are required",
      });
    }

    // Fetch user
    const [users] = await pool.execute(
      "SELECT id FROM users WHERE username = ?",
      [username]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    const userId = users[0].id;

    // Fetch security answers
    const [securityAnswers] = await pool.execute(
      "SELECT answer_1_hash, answer_2_hash, answer_3_hash FROM security_answers WHERE user_id = ?",
      [userId]
    );

    if (securityAnswers.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Security answers not found for user",
      });
    }

    // Compare answers (case-insensitive, trimmed)
    const answers = securityAnswers[0];
    const answerMatches = await Promise.all([
      bcrypt.compare(answer1.toLowerCase().trim(), answers.answer_1_hash),
      bcrypt.compare(answer2.toLowerCase().trim(), answers.answer_2_hash),
      bcrypt.compare(answer3.toLowerCase().trim(), answers.answer_3_hash),
    ]);

    if (!answerMatches.every((match) => match === true)) {
      console.log(`Incorrect answers provided for user ${username}`);
      return res.status(401).json({
        success: false,
        error: "Incorrect answers provided",
      });
    }

    // Generate temporary verification token (valid for 15 minutes)
    const verificationToken = jwt.sign(
      { userId, purpose: "password-reset", username },
      process.env.JWT_SECRET || "default_secret_key",
      { expiresIn: "15m" }
    );

    console.log(`Security answers verified for user ${username}`);

    res.json({
      success: true,
      message: "Security answers verified successfully",
      verificationToken,
    });
  } catch (error) {
    console.error("Security answer verification error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to verify security answers",
    });
  }
});

// Reset password with verification token
router.post("/reset-password", async (req, res) => {
  try {
    const { username, verificationToken, newPassword, confirmPassword } =
      req.body;

    console.log(`Password reset request for username: ${username}`);

    // Validate input
    if (!username || !verificationToken || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        error: "All fields are required",
      });
    }

    // Validate password length
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: "Password must be at least 6 characters long",
      });
    }

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        error: "Passwords do not match",
      });
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(
        verificationToken,
        process.env.JWT_SECRET || "default_secret_key"
      );
    } catch (err) {
      return res.status(401).json({
        success: false,
        error: "Invalid or expired verification token",
      });
    }

    // Verify token purpose and username match
    if (decoded.purpose !== "password-reset" || decoded.username !== username) {
      return res.status(401).json({
        success: false,
        error: "Token mismatch or invalid purpose",
      });
    }

    // Fetch user
    const [users] = await pool.execute(
      "SELECT id FROM users WHERE username = ?",
      [username]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    const userId = users[0].id;

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password in database
    await pool.execute("UPDATE users SET password_hash = ? WHERE id = ?", [
      hashedPassword,
      userId,
    ]);

    console.log(`Password reset successful for user ${username}`);

    res.json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error) {
    console.error("Password reset error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to reset password",
    });
  }
});

export default router;
