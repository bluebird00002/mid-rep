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
  // New behavior:
  // - Admin username is derived from the authenticated user's username: <username>-admin
  // - If an admin account exists for that derived username, verify the provided password against its hash
  // - If no admin account exists, check the admin_defaults collection for a default password; if it matches,
  //   create a new admin account for that user with the default password hash and mark main_admin if first
  const { username, password, userId } = req.body;
  const baseUsername = (username || "").toString().trim();
  const adminUsername = baseUsername ? `${baseUsername}-admin` : "admin";
  try {
    // Look up existing admin account for this user
    const snap = await firestore
      .collection("admin_accounts")
      .where("username", "==", adminUsername)
      .limit(1)
      .get();

    if (!snap.empty) {
      const doc = snap.docs[0];
      const adminDoc = { id: doc.id, ...(doc.data() || {}) };
      const providedPwd = (password || "").toString().trim();
      console.log(`Admin login attempt for username=${adminUsername} (existing account).`);
      let match = false;
      try {
        match = await bcrypt.compare(providedPwd, adminDoc.password_hash || "");
      } catch (e) {
        console.warn("bcrypt compare failed:", e && e.message);
        match = false;
      }
      console.log(`Password compare result for ${adminUsername}: ${match}`);
      if (!match) return res.status(401).json({ success: false, message: "Incorrect password" });

      // Record admin login event for auditing
      try {
        await firestore.collection("admin_logins").add({
          username: adminDoc.username,
          userId: userId || null,
          login_time: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
          ip: req.ip || null,
        });
      } catch (logErr) {
        console.warn("Failed to record admin login:", logErr.message || logErr);
      }

      return res.json({ success: true, admin: { id: adminDoc.id, username: adminDoc.username, main_admin: !!adminDoc.main_admin } });
    }

    // No existing admin account for this user -> check default password store
    // Look for admin default record
    const defSnap = await firestore.collection("admin_defaults").limit(1).get();
    let defaultHash = null;
    let defaultDocId = null;
    if (!defSnap.empty) {
      const d = defSnap.docs[0];
      defaultHash = d.data()?.password_hash || null;
      defaultDocId = d.id;
    }

    // If no default exists, treat this login as creating the first/default password and main admin
    if (!defaultHash) {
      // First admin: set the provided password as the default (hash it) and create admin account
      const provided = (password || "").toString().trim();
      if (!provided) return res.status(401).json({ success: false, message: "Incorrect password" });
      const hash = await bcrypt.hash(provided, 10);
      const defRef = firestore.collection("admin_defaults").doc();
      await defRef.set({ password_hash: hash, created_by: userId || null, created_at: firebaseAdmin.firestore.FieldValue.serverTimestamp() });
      defaultHash = hash;
      defaultDocId = defRef.id;
      console.log(`Initialized admin default password by userId=${userId || "unknown"}`);
    }

    // Compare provided password to default hash
    const providedPwd = (password || "").toString().trim();
    let defaultMatch = false;
    try {
      defaultMatch = defaultHash ? await bcrypt.compare(providedPwd, defaultHash) : false;
    } catch (e) {
      console.warn("bcrypt compare for default failed:", e && e.message);
      defaultMatch = false;
    }
    console.log(`Default password compare result for ${adminUsername}: ${defaultMatch}`);
    if (!defaultMatch) return res.status(401).json({ success: false, message: "Incorrect password" });

    // Create a new admin account for this user using the default hash
    // Determine if there is an existing main admin
    const mainSnap = await firestore.collection("admin_accounts").where("main_admin", "==", true).limit(1).get();
    const isMain = mainSnap.empty; // if no main admin exists, this new admin becomes main
    const newRef = firestore.collection("admin_accounts").doc();
    await newRef.set({
      username: adminUsername,
      password_hash: defaultHash,
      created_by_user_id: userId || null,
      main_admin: !!isMain,
      created_at: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
    });

    // Record admin login event
    try {
      await firestore.collection("admin_logins").add({
        username: adminUsername,
        userId: userId || null,
        login_time: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
        ip: req.ip || null,
      });
    } catch (logErr) {
      console.warn("Failed to record admin login:", logErr.message || logErr);
    }

    return res.json({ success: true, admin: { id: newRef.id, username: adminUsername, main_admin: !!isMain } });
  } catch (err) {
    console.error("Admin login error:", err && err.message);
    return res.status(500).json({ success: false, message: "Server error", error: err.message });
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
    let uname = (username || "").toString().trim() || "admin";
    // accept base username or admin username; ensure we use the admin account form
    if (!uname.endsWith("-admin")) uname = `${uname}-admin`;
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

// Change default admin password (only main admin may perform)
router.post("/passdef-change", async (req, res) => {
  const { username, adminPassword, oldDefaultPassword, newDefaultPassword } = req.body;
  try {
    if (!username || !adminPassword || !oldDefaultPassword || !newDefaultPassword)
      return res.status(400).json({ success: false, message: "Missing parameters" });

    // Normalize admin username to <user>-admin form
    let adminU = (username || "").toString().trim();
    if (!adminU.endsWith("-admin")) adminU = `${adminU}-admin`;

    const snap = await firestore.collection("admin_accounts").where("username", "==", adminU).limit(1).get();
    if (snap.empty) return res.status(401).json({ success: false, message: "Admin account not found" });
    const doc = snap.docs[0];
    const adminDoc = { id: doc.id, ...(doc.data() || {}) };

    // Only main admin can change the default
    if (!adminDoc.main_admin)
      return res.status(403).json({ success: false, message: "Only main admin may change the default password" });

    // Verify main admin's password
    const adminPwd = (adminPassword || "").toString().trim();
    let ok = false;
    try {
      ok = await bcrypt.compare(adminPwd, adminDoc.password_hash || "");
    } catch (e) {
      console.warn("bcrypt compare failed for admin auth:", e && e.message);
      ok = false;
    }
    if (!ok) return res.status(401).json({ success: false, message: "Incorrect admin password" });

    // Fetch current default
    const defSnap = await firestore.collection("admin_defaults").limit(1).get();
    if (defSnap.empty)
      return res.status(400).json({ success: false, message: "No default password set" });
    const defDoc = defSnap.docs[0];
    const defData = defDoc.data() || {};
    const currentHash = defData.password_hash || null;
    const providedOld = (oldDefaultPassword || "").toString().trim();
    let oldMatch = false;
    try {
      oldMatch = currentHash ? await bcrypt.compare(providedOld, currentHash) : false;
    } catch (e) {
      console.warn("bcrypt compare failed for default password:", e && e.message);
      oldMatch = false;
    }
    if (!oldMatch) return res.status(401).json({ success: false, message: "Incorrect current default password" });

    if (!newDefaultPassword || newDefaultPassword.length < 6)
      return res.status(400).json({ success: false, message: "New default password must be at least 6 characters" });

    // Update default record with new hash
    const newHash = await bcrypt.hash(newDefaultPassword.toString(), 10);
    await firestore.collection("admin_defaults").doc(defDoc.id).update({
      password_hash: newHash,
      updated_by: adminDoc.id,
      updated_at: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
    });

    return res.json({ success: true, message: "Default admin password updated" });
  } catch (err) {
    console.error("passdef-change error:", err && err.message);
    return res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
});

export default router;
