import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { admin, db } from "../config/firebase.js";
import authenticateToken from "../middleware/auth.js";
import sanitize from "../middleware/sanitize.js";
import { rateLimit } from "../middleware/rateLimit.js";

const router = express.Router();
const ADMIN_ROLES = new Set(["admin", "superadmin"]);

async function audit(actor, action, target = null, details = {}) {
  await db.collection("admin_audit").add({
    actor_user_id: actor.userId,
    actor_username: actor.username,
    actor_role: actor.role,
    action,
    target_user_id: target,
    details,
    created_at: admin.firestore.FieldValue.serverTimestamp(),
  });
}

async function requireAdminToken(req, res, next) {
  try {
    const token = req.headers.authorization?.startsWith("Bearer ")
      ? req.headers.authorization.slice(7)
      : null;
    if (!token) return res.status(401).json({ success: false, error: "Admin session required" });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.scope !== "admin" || !ADMIN_ROLES.has(decoded.role)) {
      return res.status(403).json({ success: false, error: "Administrator privileges required" });
    }
    const user = await db.collection("users").doc(decoded.userId).get();
    const current = user.exists ? user.data() : null;
    if (!current || current.status === "suspended" || current.role !== decoded.role) {
      return res.status(403).json({ success: false, error: "Administrator access is no longer active" });
    }
    req.adminUser = decoded;
    next();
  } catch {
    return res.status(401).json({ success: false, error: "Invalid or expired admin session" });
  }
}

// Re-authenticate an already signed-in account and elevate only pre-authorized roles.
router.post("/login", authenticateToken, rateLimit(5, 15 * 60 * 1000, "admin-login"), sanitize(), async (req, res) => {
  try {
    const password = typeof req.body.password === "string" ? req.body.password : "";
    const snapshot = await db.collection("users").doc(req.user.userId).get();
    if (!snapshot.exists) return res.status(404).json({ success: false, error: "User not found" });
    const user = snapshot.data();
    if (user.status === "suspended" || !ADMIN_ROLES.has(user.role)) {
      return res.status(403).json({ success: false, error: "This account does not have administrator privileges" });
    }
    if (!await bcrypt.compare(password, user.password_hash || "")) {
      return res.status(401).json({ success: false, error: "Incorrect account password" });
    }
    const identity = { userId: snapshot.id, username: user.username, role: user.role, scope: "admin" };
    const adminToken = jwt.sign(identity, process.env.JWT_SECRET, { expiresIn: "15m" });
    await audit(identity, "admin.login");
    return res.json({
      success: true,
      data: { token: adminToken, expiresIn: "15m", admin: { username: user.username, role: user.role } },
    });
  } catch (error) {
    console.error("Admin login error:", error);
    return res.status(500).json({ success: false, error: "Admin login failed" });
  }
});

router.use(requireAdminToken);

router.get("/me", (req, res) => res.json({ success: true, data: { admin: req.adminUser } }));

router.get("/overview", async (req, res) => {
  try {
    const [users, memories, images] = await Promise.all([
      db.collection("users").count().get(),
      db.collection("memories").count().get(),
      db.collection("images").count().get(),
    ]);
    return res.json({ success: true, data: {
      users: users.data().count,
      memories: memories.data().count,
      images: images.data().count,
      role: req.adminUser.role,
    } });
  } catch (error) {
    console.error("Admin overview error:", error);
    return res.status(500).json({ success: false, error: "Unable to load system overview" });
  }
});

router.get("/users", async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 50, 1), 100);
    const snapshot = await db.collection("users").orderBy("created_at", "desc").limit(limit).get();
    const users = snapshot.docs.map((document) => {
      const value = document.data();
      return {
        id: document.id,
        username: value.username,
        role: value.role || "user",
        status: value.status || "active",
        created_at: value.created_at?.toDate?.().toISOString() || value.created_at || null,
      };
    });
    return res.json({ success: true, data: { users } });
  } catch (error) {
    console.error("Admin users error:", error);
    return res.status(500).json({ success: false, error: "Unable to load users" });
  }
});

router.get("/activity", async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 50, 1), 100);
    const snapshot = await db.collection("admin_audit").orderBy("created_at", "desc").limit(limit).get();
    const activity = snapshot.docs.map((document) => {
      const value = document.data();
      return { id: document.id, ...value, created_at: value.created_at?.toDate?.().toISOString() || null };
    });
    return res.json({ success: true, data: { activity } });
  } catch (error) {
    console.error("Admin activity error:", error);
    return res.status(500).json({ success: false, error: "Unable to load audit activity" });
  }
});

router.patch("/users/:id/status", sanitize(), async (req, res) => {
  try {
    const status = req.body.status;
    if (!["active", "suspended"].includes(status)) {
      return res.status(400).json({ success: false, error: "Status must be active or suspended" });
    }
    if (req.params.id === req.adminUser.userId) {
      return res.status(400).json({ success: false, error: "You cannot change your own status" });
    }
    const target = await db.collection("users").doc(req.params.id).get();
    if (!target.exists) return res.status(404).json({ success: false, error: "User not found" });
    const targetRole = target.data().role || "user";
    if (ADMIN_ROLES.has(targetRole) && req.adminUser.role !== "superadmin") {
      return res.status(403).json({ success: false, error: "Only a superadmin can manage another administrator" });
    }
    await target.ref.update({ status, updated_at: admin.firestore.FieldValue.serverTimestamp() });
    await audit(req.adminUser, `user.${status}`, target.id, { username: target.data().username });
    return res.json({ success: true, message: `User ${status}` });
  } catch (error) {
    console.error("Admin status update error:", error);
    return res.status(500).json({ success: false, error: "Unable to update user status" });
  }
});

router.patch("/users/:id/role", sanitize(), async (req, res) => {
  try {
    if (req.adminUser.role !== "superadmin") {
      return res.status(403).json({ success: false, error: "Only a superadmin can change roles" });
    }
    if (!["user", "admin"].includes(req.body.role)) {
      return res.status(400).json({ success: false, error: "Role must be user or admin" });
    }
    if (req.params.id === req.adminUser.userId) {
      return res.status(400).json({ success: false, error: "You cannot change your own role" });
    }
    const target = await db.collection("users").doc(req.params.id).get();
    if (!target.exists) return res.status(404).json({ success: false, error: "User not found" });
    if (target.data().role === "superadmin") {
      return res.status(403).json({ success: false, error: "The superadmin role cannot be changed here" });
    }
    await target.ref.update({ role: req.body.role, updated_at: admin.firestore.FieldValue.serverTimestamp() });
    await audit(req.adminUser, "user.role_changed", target.id, { role: req.body.role, username: target.data().username });
    return res.json({ success: true, message: `Role changed to ${req.body.role}` });
  } catch (error) {
    console.error("Admin role update error:", error);
    return res.status(500).json({ success: false, error: "Unable to change user role" });
  }
});

export default router;
