import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { admin, db } from "../config/firebase.js";
import sanitize from "../middleware/sanitize.js";

const router = express.Router();

// Debug middleware
router.use((req, res, next) => {
  console.log(`📨 Auth Route: ${req.method} ${req.path}`);
  next();
});

// Simple in-memory rate limiter (IP-based) for abuse protection in dev/prototype
const rateLimits = new Map();
function rateLimit(maxRequests = 60, windowMs = 60 * 1000) {
  return (req, res, next) => {
    try {
      const key = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
      const now = Date.now();
      const entry = rateLimits.get(key) || { count: 0, start: now };
      if (now - entry.start > windowMs) {
        entry.count = 1;
        entry.start = now;
      } else {
        entry.count += 1;
      }
      rateLimits.set(key, entry);
      if (entry.count > maxRequests) {
        return res.status(429).json({ success: false, error: 'Too many requests. Please try again later.' });
      }
      next();
    } catch (err) {
      next();
    }
  };
}

// Register new user
router.post("/register", rateLimit(10, 60 * 1000), sanitize(), async (req, res) => {
  try {
    const { username, password, securityAnswers, profile_image_url } = req.body;

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

    // Normalize username (trim + lowercase)
    const normalizedUsername = username.trim().toLowerCase();

    // Comprehensive username validation (same as check-username endpoint)
    // Length validation (5-24 characters)
    if (normalizedUsername.length < 5) {
      return res.status(400).json({
        success: false,
        error: "Username must be at least 5 characters.",
      });
    }
    if (normalizedUsername.length > 24) {
      return res.status(400).json({
        success: false,
        error: "Username must be at most 24 characters.",
      });
    }

    // Format validation (only lowercase letters, numbers, underscore, period, hyphen)
    const formatRegex = /^[a-z0-9_.-]+$/;
    if (!formatRegex.test(normalizedUsername)) {
      return res.status(400).json({
        success: false,
        error:
          "Username can only contain lowercase letters, numbers, periods, and underscores.",
      });
    }

    // No spaces allowed
    if (username.includes(" ")) {
      return res.status(400).json({
        success: false,
        error: "Username cannot contain spaces.",
      });
    }

    // Cannot start or end with period
    if (
      normalizedUsername.startsWith(".") ||
      normalizedUsername.endsWith(".")
    ) {
      return res.status(400).json({
        success: false,
        error: "Username cannot start or end with a period.",
      });
    }

    // No consecutive periods
    if (normalizedUsername.includes("..")) {
      return res.status(400).json({
        success: false,
        error: "Username cannot contain consecutive periods.",
      });
    }

    // Must contain at least one letter
    if (!/[a-z]/.test(normalizedUsername)) {
      return res.status(400).json({
        success: false,
        error: "Username must contain at least one letter.",
      });
    }

    // RESTRICTED KEYWORD CHECK - "ceo" (case-insensitive, anywhere in username)
    if (normalizedUsername.toLowerCase().includes("ceo")) {
      return res.status(400).json({
        success: false,
        error: "This username is already taken.",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: "Password must be at least 6 characters",
      });
    }

    // Hash password and security answers (case-insensitive, trimmed)
    const hashedPassword = await bcrypt.hash(password, 10);
    const hashedAnswer1 = await bcrypt.hash(
      securityAnswers.answer1.toLowerCase().trim(),
      10,
    );
    const hashedAnswer2 = await bcrypt.hash(
      securityAnswers.answer2.toLowerCase().trim(),
      10,
    );
    const hashedAnswer3 = await bcrypt.hash(
      securityAnswers.answer3.toLowerCase().trim(),
      10,
    );

    // Use a Firestore transaction to create a unique username mapping
    const lowerUsername = normalizedUsername;
    const usernamesRef = db.collection("usernames").doc(lowerUsername);
    const usersRef = db.collection("users").doc();
    const secRef = db.collection("security_answers").doc();

    try {
      await db.runTransaction(async (t) => {
        const nameSnap = await t.get(usernamesRef);
        if (nameSnap.exists) {
          throw new Error("USERNAME_TAKEN");
        }

        // create username mapping + user + security answers atomically
        t.set(usernamesRef, {
          user_id: usersRef.id,
          created_at: admin.firestore.FieldValue.serverTimestamp(),
        });

        t.set(usersRef, {
          username: lowerUsername,
          password_hash: hashedPassword,
          profile_image_url: profile_image_url || null,
          created_at: admin.firestore.FieldValue.serverTimestamp(),
        });

        t.set(secRef, {
          user_id: usersRef.id,
          question_1: "What is your favorite color?",
          answer_1_hash: hashedAnswer1,
          question_2: "What is the name of your first pet?",
          answer_2_hash: hashedAnswer2,
          question_3: "In what city were you born?",
          answer_3_hash: hashedAnswer3,
          created_at: admin.firestore.FieldValue.serverTimestamp(),
        });
      });
    } catch (txErr) {
      if (txErr.message === "USERNAME_TAKEN") {
        return res.status(400).json({ success: false, error: "This username is already taken." });
      }
      console.error("Transaction error:", txErr);
      return res.status(500).json({ success: false, error: "Failed to create account" });
    }

    const userId = usersRef.id;
    console.log(`✅ User created (transaction): ${lowerUsername} (id=${userId})`);

    // Generate JWT token
    const jwtSecret =
      process.env.JWT_SECRET ||
      "mid-development-secret-key-change-in-production-2024";
    const token = jwt.sign(
      { userId, username: lowerUsername },
      jwtSecret,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || "7d",
      },
    );

    res.status(201).json({
      success: true,
      data: {
        token,
        user: {
          id: userId,
          username: lowerUsername,
          profile_image_url: profile_image_url || null,
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

    // Find user in Firestore
    const usersSnap = await db
      .collection("users")
      .where("username", "==", username)
      .limit(1)
      .get();

    if (usersSnap.empty) {
      console.log(`❌ User not found: ${username}`);
      return res.status(401).json({
        success: false,
        error: "Invalid username or password",
      });
    }

    const userDoc = usersSnap.docs[0];
    const user = { id: userDoc.id, ...userDoc.data() };
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
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" },
    );

    console.log(`✅ Token generated for user: ${username}`);

    // Track login attempt
    try {
      const ipAddress =
        req.headers["x-forwarded-for"] ||
        req.connection.remoteAddress ||
        "unknown";
      const userAgent = req.headers["user-agent"] || "unknown";

      // Check login count from Firestore login_track
      let loginCount = 0;
      try {
        const countSnap = await db
          .collection("login_track")
          .where("user_id", "==", user.id)
          .get();
        loginCount = countSnap.size || 0;
        console.log(
          `DEBUG: User ${username} (ID: ${user.id}) has ${loginCount} previous logins`,
        );
      } catch (queryError) {
        console.warn(
          `DEBUG: Could not query login_track: ${queryError.message}. Assuming first login.`,
        );
        loginCount = 0;
      }

      const isFirstLogin = loginCount === 0;

      // Insert login record into Firestore
      try {
        await db.collection("login_track").add({
          user_id: user.id,
          ip_address: ipAddress,
          user_agent: userAgent,
          created_at: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log(
          `✅ Login tracked for user: ${username} (ID: ${user.id}). IP: ${ipAddress}`,
        );
      } catch (insertError) {
        console.error(
          `⚠️  Error inserting login record: ${insertError.message}`,
        );
      }

      res.json({
        success: true,
        data: {
          token,
          user: {
            id: user.id,
            username: user.username,
            profile_image_url: user.profile_image_url || null,
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
            profile_image_url: user.profile_image_url || null,
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

      // Get fresh user data from Firestore
      const userDoc = await db.collection("users").doc(decoded.userId).get();
      if (!userDoc.exists) {
        return res.status(404).json({
          success: false,
          error: "User not found",
        });
      }

      res.json({
        success: true,
        data: {
          user: { id: userDoc.id, ...userDoc.data() },
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
        // Get user creation date from Firestore
        const userDoc = await db.collection("users").doc(decoded.userId).get();

        if (!userDoc.exists) {
          return res.status(404).json({
            success: false,
            error: "User not found",
          });
        }

        const user = { id: userDoc.id, ...userDoc.data() };

        // Check login count from login_track collection
        let loginCount = 0;
        try {
          const loginRecords = await db
            .collection("login_track")
            .where("user_id", "==", user.id)
            .get();
          loginCount = loginRecords.size || 0;
        } catch (queryError) {
          console.warn(
            `DEBUG: Error querying login_track: ${queryError.message}`,
          );
          loginCount = 0;
        }

        const isNew = loginCount === 1; // First login if exactly 1 record exists
        console.log(
          `✅ isNewUser check - user_id: ${user.id}, loginCount: ${loginCount}, isNew: ${isNew}`,
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

// Verify username existence / availability (used by frontend live-check)
router.post("/verify-username", rateLimit(60, 60 * 1000), sanitize(), async (req, res) => {
  try {
    const { username } = req.body;

    console.log(`Username verification attempt: ${username}`);

    // Validate input
    if (!username || username.length < 3) {
      return res
        .status(400)
        .json({ success: false, error: "Valid username is required" });
    }

    // If username contains 'ceo' (case-insensitive), treat as reserved/unavailable
      if (/ceo/i.test(username)) {
        return res.json({
          success: true,
          exists: true,
          message: "This username is already taken",
        });
      }

    // Check if user exists in Firestore
    const usersSnap = await db
      .collection("users")
      .where("username", "==", username)
      .limit(1)
      .get();
    const exists = !usersSnap.empty;

    res.json({
      success: true,
      exists,
      message: exists ? "Username already exists" : "Username available",
    });
  } catch (error) {
    console.error("Username verification error:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to verify username" });
  }
});

// ============================================
// NEW: Real-time username check endpoint (GET)
// Comprehensive validation with format, restricted keywords, and uniqueness
// ============================================
router.get("/check-username", rateLimit(60, 60 * 1000), sanitize(), async (req, res) => {
  try {
    const { username } = req.query;

    console.log(`🔍 Username check: ${username}`);

    // 1. Basic input validation
    if (!username || typeof username !== "string") {
      return res.json({ available: false, error: "Username is required" });
    }

    // 2. Trim whitespace
    const trimmedUsername = username.trim();

    // 3. Length validation (5-24 characters)
    if (trimmedUsername.length < 5) {
      return res.json({
        available: false,
        error: "Username must be at least 5 characters.",
      });
    }
    if (trimmedUsername.length > 24) {
      return res.json({
        available: false,
        error: "Username must be at most 24 characters.",
      });
    }

    // 4. Format validation (only lowercase letters, numbers, underscore, period)
    const formatRegex = /^[a-z0-9_.-]+$/;
    if (!formatRegex.test(trimmedUsername)) {
      return res.json({
        available: false,
        error:
          "Username can only contain lowercase letters, numbers, periods, and underscores.",
      });
    }

    // 5. No spaces allowed
    if (username.includes(" ")) {
      return res.json({
        available: false,
        error: "Username cannot contain spaces.",
      });
    }

    // 6. Cannot start or end with period
    if (trimmedUsername.startsWith(".") || trimmedUsername.endsWith(".")) {
      return res.json({
        available: false,
        error: "Username cannot start or end with a period.",
      });
    }

    // 7. No consecutive periods
    if (trimmedUsername.includes("..")) {
      return res.json({
        available: false,
        error: "Username cannot contain consecutive periods.",
      });
    }

    // 8. Must contain at least one letter
    const hasLetter = /[a-z]/.test(trimmedUsername);
    if (!hasLetter) {
      return res.json({
        available: false,
        error: "Username must contain at least one letter.",
      });
    }

    // 9. RESTRICTED KEYWORD CHECK - "ceo" (case-insensitive, anywhere in username)
    if (trimmedUsername.toLowerCase().includes("ceo")) {
      console.log(`🚫 Restricted keyword detected: ${trimmedUsername}`);
      return res.json({
        available: false,
        error: "This username is already taken.",
      });
    }

    // 10. Database uniqueness check (case-insensitive)
    // Convert to lowercase for case-insensitive comparison
    const lowerUsername = trimmedUsername.toLowerCase();
    const usersSnap = await db
      .collection("users")
      .where("username", "==", lowerUsername)
      .limit(1)
      .get();

    if (!usersSnap.empty) {
      console.log(`❌ Username taken: ${trimmedUsername}`);
      return res.json({
        available: false,
        error: "This username is already taken.",
      });
    }

    console.log(`✅ Username available: ${trimmedUsername}`);
    res.json({ available: true });
  } catch (error) {
    console.error("Username check error:", error);
    res.status(500).json({
      available: false,
      error: "Unable to verify username. Please try again.",
    });
  }
});

// Suggest username candidates (returns up to 3 unique suggestions)
router.get("/suggest-username", rateLimit(30, 60 * 1000), sanitize(), async (req, res) => {
  try {
    const { count = 3 } = req.query;
    const max = Math.min(5, Math.max(1, parseInt(count, 10) || 3));

    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    const generateCandidate = () => {
      const length = Math.floor(Math.random() * 5) + 4; // 4-8 chars
      let s = "";
      for (let i = 0; i < length; i++) s += chars.charAt(Math.floor(Math.random() * chars.length));
      // use underscore separator to conform to allowed characters
      return `mid_${s}`;
    };

    const suggestions = new Set();
    let attempts = 0;
    while (suggestions.size < max && attempts < 50) {
      attempts += 1;
      const cand = generateCandidate();
      if (/ceo/i.test(cand)) continue;

      // check usernames collection and users collection for existence
      const nameSnap = await db.collection("usernames").doc(cand.toLowerCase()).get();
      if (nameSnap.exists) continue;
      const userSnap = await db.collection("users").where("username", "==", cand.toLowerCase()).limit(1).get();
      if (!userSnap.empty) continue;

      suggestions.add(cand);
    }

    res.json({ success: true, suggestions: Array.from(suggestions) });
  } catch (err) {
    console.error("Suggest username error:", err);
    res.status(500).json({ success: false, error: "Unable to generate suggestions" });
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
    const usersSnap = await db
      .collection("users")
      .where("username", "==", username)
      .limit(1)
      .get();

    if (usersSnap.empty) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    const userDoc = usersSnap.docs[0];
    const userId = userDoc.id;

    // Fetch security answers from Firestore
    const secSnap = await db
      .collection("security_answers")
      .where("user_id", "==", userId)
      .limit(1)
      .get();

    if (secSnap.empty) {
      return res.status(404).json({
        success: false,
        error: "Security answers not found for user",
      });
    }

    // Compare answers (case-insensitive, trimmed)
    const answers = secSnap.docs[0].data();
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
      { expiresIn: "15m" },
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
        process.env.JWT_SECRET || "default_secret_key",
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

    // Fetch user from Firestore
    const usersSnap = await db
      .collection("users")
      .where("username", "==", username)
      .limit(1)
      .get();

    if (usersSnap.empty) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    const userDoc = usersSnap.docs[0];
    const userId = userDoc.id;

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password in Firestore
    await db.collection("users").doc(userId).update({
      password_hash: hashedPassword,
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    });

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

// Get user profile (including profile image URL)
router.get("/profile", async (req, res) => {
  try {
    // Extract userId from Authorization header (format: "Bearer <token>")
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const token = authHeader.substring(7);
    const jwtSecret =
      process.env.JWT_SECRET ||
      "mid-development-secret-key-change-in-production-2024";
    let decoded;
    try {
      decoded = jwt.verify(token, jwtSecret);
    } catch (err) {
      return res.status(401).json({ success: false, error: "Invalid token" });
    }

    const userId = decoded.userId;
    const userDoc = await db.collection("users").doc(userId).get();

    if (!userDoc.exists) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const userData = userDoc.data();
    res.json({
      success: true,
      data: {
        id: userId,
        username: userData.username,
        profile_image_url: userData.profile_image_url || null,
      },
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ success: false, error: "Failed to get profile" });
  }
});

// Upload/Update profile image (expects JSON body with profile_image_url from Cloudinary)
router.put("/profile-image", async (req, res) => {
  try {
    // Extract userId from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const token = authHeader.substring(7);
    const jwtSecret =
      process.env.JWT_SECRET ||
      "mid-development-secret-key-change-in-production-2024";
    let decoded;
    try {
      decoded = jwt.verify(token, jwtSecret);
    } catch (err) {
      return res.status(401).json({ success: false, error: "Invalid token" });
    }

    const userId = decoded.userId;
    const { profile_image_url } = req.body;

    // Allow null/undefined to remove profile image
    const updateData = {
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    };

    // If profile_image_url is provided (even if empty), update it
    if ("profile_image_url" in req.body) {
      updateData.profile_image_url = profile_image_url || null;
    }

    // Update user profile image in Firestore
    await db.collection("users").doc(userId).update(updateData);

    console.log(`Profile image updated for user ${userId}`);

    res.json({
      success: true,
      data: { profile_image_url: profile_image_url || null },
      message: "Profile image updated successfully",
    });
  } catch (error) {
    console.error("Update profile image error:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to update profile image" });
  }
});

export default router;
