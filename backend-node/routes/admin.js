import express from "express";
import db from "../config/database.js";
import { createRequire } from "module";

// Use createRequire to allow conditional require of native bcrypt
const require = createRequire(import.meta.url);
let bcrypt;
try {
  // Prefer native bcrypt if available
  bcrypt = require("bcrypt");
} catch (e) {
  // Fallback to bcryptjs which is pure JS and more likely available in restricted envs
  try {
    bcrypt = require("bcryptjs");
    console.log("Using bcryptjs fallback for password hashing/comparison");
  } catch (err) {
    console.error("No bcrypt or bcryptjs available:", err);
    // Re-throw so that the app startup or route import will surface an error clearly
    throw err;
  }
}

const router = express.Router();

// Delete a user by ID (permanent)
router.delete("/users/:id", async (req, res) => {
  const userId = req.params.id;
  try {
    await db.query("DELETE FROM users WHERE id = ?", [userId]);
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
    await db.query("UPDATE users SET password_hash = ? WHERE id = ?", [
      hash,
      userId,
    ]);
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
    const [rows] = await db.query(
      "SELECT * FROM admin_accounts WHERE username = ?",
      [checkUsername],
    );
    if (!rows.length)
      return res
        .status(401)
        .json({ success: false, message: "Admin not found" });
    const admin = rows[0];
    const match = await bcrypt.compare(password, admin.password_hash);
    if (!match)
      return res
        .status(401)
        .json({ success: false, message: "Incorrect password" });
    res.json({
      success: true,
      admin: { id: admin.id, username: admin.username },
    });
  } catch (err) {
    console.error("Admin login error:", err);
    // Log DB environment variables to help debug connection issues (don't log passwords)
    try {
      console.error("DB_DEBUG: host=", process.env.DB_HOST, "port=", process.env.DB_PORT, "user=", process.env.DB_USER ? process.env.DB_USER.replace(/./g, '*') : undefined);
    } catch (e) {
      console.error("DB debug logging failed", e);
    }
    if (err && err.code === 'ECONNREFUSED') {
      return res.status(503).json({ success: false, message: "Database connection refused" });
    }
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
});

// Debug endpoint to check DB connectivity quickly (remove or protect in production)
router.get('/debug-db', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT 1 as ok');
    res.json({ success: true, ok: rows[0] });
  } catch (err) {
    console.error('DB debug query failed:', err);
    res.status(503).json({ success: false, message: 'Database unavailable', error: err.message });
  }
});

// Change admin password
router.post("/change-password", async (req, res) => {
  const { username, oldPassword, newPassword } = req.body;
  try {
    const [rows] = await db.query(
      "SELECT * FROM admin_accounts WHERE username = ?",
      [username],
    );
    if (!rows.length)
      return res
        .status(401)
        .json({ success: false, message: "Admin not found" });
    const admin = rows[0];
    const match = await bcrypt.compare(oldPassword, admin.password_hash);
    if (!match)
      return res
        .status(401)
        .json({ success: false, message: "Incorrect old password" });
    const newHash = await bcrypt.hash(newPassword, 10);
    await db.query("UPDATE admin_accounts SET password_hash = ? WHERE id = ?", [
      newHash,
      admin.id,
    ]);
    res.json({ success: true, message: "Password changed successfully" });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
});

// List all users (for admin dashboard)
router.get("/users", async (req, res) => {
  try {
    const [users] = await db.query(
      "SELECT id, username, created_at FROM users",
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
    const [logs] = await db.query(
      "SELECT * FROM login_track ORDER BY login_time DESC LIMIT 100",
    );
    res.json({ success: true, logs });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
});

export default router;
