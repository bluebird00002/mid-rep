import express from "express";
import { createRequire } from "module";
import { db as firestore, admin as firebaseAdmin } from "../config/firebase.js";

// Use createRequire to allow conditional require of native bcrypt
const require = createRequire(import.meta.url);
let bcrypt;
try {
  bcrypt = require("bcrypt");
} catch (e) {
  try {
    bcrypt = require("bcryptjs");
    console.log("Using bcryptjs fallback for password hashing/comparison");
  } catch (err) {
    console.error("No bcrypt or bcryptjs available:", err);
    throw err;
  }
}

const router = express.Router();

// Delete a user by ID (permanent) - using Firestore
router.delete("/users/:id", async (req, res) => {
  const userId = req.params.id;
  try {
    await firestore.collection("users").doc(userId).delete();
    res.json({ success: true, message: "User deleted successfully" });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
});

// Reset a user's password (admin sets new password)
router.post("/users/:id/reset-password", async (req, res) => {
  const userId = req.params.id;
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({
      success: false,
      message: "New password must be at least 6 characters.",
    });
  }
  try {
    const hash = await bcrypt.hash(newPassword, 10);
    await firestore.collection("users").doc(userId).update({
      password_hash: hash,
      updated_at: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
    });
    res.json({ success: true, message: "Password reset successfully" });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
});

// Admin login
router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const checkUsername = username || "admin";
  try {
    const snapshot = await firestore
      .collection("admin_accounts")
      .where("username", "==", checkUsername)
      .limit(1)
      .get();

    let adminDoc;
    if (snapshot.empty) {
      // Create default admin if not present. Default password is strict 'midme'.
      const defaultPassword = "midme";
      const hash = await bcrypt.hash(defaultPassword, 10);
      const newRef = firestore.collection("admin_accounts").doc();
      await newRef.set({
        username: checkUsername,
        password_hash: hash,
        created_at: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
      });
      adminDoc = {
        id: newRef.id,
        username: checkUsername,
        password_hash: hash,
      };
      console.log(`Created default admin account for username=${checkUsername}`);
    } else {
      const doc = snapshot.docs[0];
      adminDoc = { id: doc.id, ...(doc.data() || {}) };
    }

    const match = await bcrypt.compare(password, adminDoc.password_hash);
    if (!match)
      return res
        .status(401)
        .json({ success: false, message: "Incorrect password" });

    // Record admin login event for auditing
    try {
      await firestore.collection("admin_logins").add({
        username: adminDoc.username,
        userId: req.body.userId || null,
        login_time: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
        ip: req.ip || null,
      });
    } catch (logErr) {
      console.warn("Failed to record admin login:", logErr.message || logErr);
    }

    res.json({
      success: true,
      admin: { id: adminDoc.id, username: adminDoc.username },
    });
  } catch (err) {
    console.error("Admin login error:", err);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
});

// Debug endpoint to check DB connectivity quickly (remove or protect in production)
router.get("/debug-db", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT 1 as ok");
    res.json({ success: true, ok: rows[0] });
  } catch (err) {
    console.error("DB debug query failed:", err);
    res
      .status(503)
      .json({
        success: false,
        message: "Database unavailable",
        error: err.message,
      });
  }
});

// Change admin password
router.post("/change-password", async (req, res) => {
  const { username, oldPassword, newPassword } = req.body;
  try {
    const uname = (username || "").toString().trim() || "admin";
    const snapshot = await firestore
      .collection("admin_accounts")
      .where("username", "==", uname)
      .limit(1)
      .get();
    if (snapshot.empty)
      return res
        .status(401)
        .json({ success: false, message: "Admin not found" });
    const doc = snapshot.docs[0];
    const adminDoc = { id: doc.id, ...(doc.data() || {}) };

    // Defensive checks
    const providedOld = (oldPassword || "").toString();
    // Log attempt metadata (avoid logging passwords)
    console.log(`Admin password change attempt for username=${uname} (has_hash=${!!adminDoc.password_hash})`);

    let match = false;
    if (adminDoc.password_hash) {
      try {
        match = await bcrypt.compare(providedOld, adminDoc.password_hash);
      } catch (e) {
        console.warn("bcrypt compare failed:", e && e.message);
        match = false;
      }
    }

    if (!match)
      return res
        .status(401)
        .json({ success: false, message: "Incorrect old password" });

    if (!newPassword || newPassword.length < 6)
      return res
        .status(400)
        .json({ success: false, message: "New password must be at least 6 characters" });

    const newHash = await bcrypt.hash(newPassword.toString(), 10);
    await firestore.collection("admin_accounts").doc(adminDoc.id).update({
      password_hash: newHash,
      updated_at: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
    });
    res.json({ success: true, message: "Password changed successfully" });
  } catch (err) {
    console.error("Change-password error:", err && err.message);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
});

// List all users (for admin dashboard)
router.get("/users", async (req, res) => {
  try {
    const snapshot = await firestore.collection("users").get();
    const users = await Promise.all(
      snapshot.docs.map(async (d) => {
        const raw = d.data() || {};
        const u = { id: d.id, ...raw };
        // Count memories (text & image) and images stored in separate collection
        let memCount = 0;
        let imgCount = 0;
        try {
          const memSnap = await firestore
            .collection("memories")
            .where("user_id", "==", u.id)
            .get();
          memCount = memSnap.size || 0;
        } catch (e) {
          memCount = 0;
        }
        try {
          const imgSnap = await firestore
            .collection("images")
            .where("user_id", "==", u.id)
            .get();
          imgCount = imgSnap.size || 0;
        } catch (e) {
          imgCount = 0;
        }
        const totalCount = (memCount || 0) + (imgCount || 0);

        // Normalize created_at to ISO string if it's a Firestore Timestamp
        let createdAt = null;
        try {
          if (raw && raw.created_at && raw.created_at.toDate) {
            createdAt = raw.created_at.toDate().toISOString();
          } else if (raw && raw.created_at) {
            createdAt = raw.created_at;
          }
        } catch (e) {
          createdAt = raw.created_at || null;
        }

        // Return only necessary fields + counts and avatar
        return {
          id: u.id,
          username: u.username || null,
          created_at: createdAt,
          memoriesCount: memCount,
          imagesCount: imgCount,
          totalCount: totalCount,
          profile_image_url: u.profile_image_url || null,
        };
      }),
    );
    res.json({ success: true, users });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
});

// List activity logs (for admin dashboard)
router.get("/activity", async (req, res) => {
  try {
    const snapshot = await firestore
      .collection("login_track")
      .orderBy("login_time", "desc")
      .limit(100)
      .get();
    const logs = snapshot.docs.map((d) => ({ id: d.id, ...(d.data() || {}) }));
    res.json({ success: true, logs });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
});

export default router;
