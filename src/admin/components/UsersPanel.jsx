import React, { useEffect, useState } from "react";
import api from "../../services/api";
import "./UsersPanel.css";

export default function UsersPanel() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [actionMsg, setActionMsg] = useState("");
  const [resetUserId, setResetUserId] = useState(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getAllUsers();
      setUsers(res.users || res.data?.users || []);
    } catch (err) {
      setError("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter((u) =>
    u.username.toLowerCase().includes(search.toLowerCase()),
  );

  const handleDelete = async (id) => {
    if (
      !window.confirm(
        "Are you sure you want to permanently delete this user? This cannot be undone.",
      )
    )
      return;
    setActionMsg("");
    try {
      const res = await api.deleteUser(id);
      if (res.success) {
        setActionMsg("User deleted successfully.");
        setUsers((prev) => prev.filter((u) => u.id !== id));
      } else {
        setActionMsg(res.message || "Failed to delete user.");
      }
    } catch (err) {
      setActionMsg(err.message || "Failed to delete user.");
    }
  };

  const handleResetPassword = (id) => {
    setResetUserId(id);
    setResetPassword("");
    setActionMsg("");
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!resetPassword || resetPassword.length < 6) {
      setActionMsg("Password must be at least 6 characters.");
      return;
    }
    setResetLoading(true);
    try {
      const res = await api.resetUserPassword(resetUserId, resetPassword);
      if (res.success) {
        setActionMsg("Password reset successfully.");
        setResetUserId(null);
        setResetPassword("");
      } else {
        setActionMsg(res.message || "Failed to reset password.");
      }
    } catch (err) {
      setActionMsg(err.message || "Failed to reset password.");
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="admin-panel users-panel">
      <h2>Users Management</h2>
      <div className="users-actions-bar">
        <input
          type="text"
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="users-search-input"
        />
        <button onClick={fetchUsers} className="users-refresh-btn">
          Refresh
        </button>
      </div>
      {loading && <div className="users-loading">Loading users...</div>}
      {error && <div className="users-error">{error}</div>}
      {actionMsg && <div className="users-action-msg">{actionMsg}</div>}
      <table className="users-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Username</th>
            <th>Created</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredUsers.length === 0 && !loading ? (
            <tr>
              <td colSpan={4}>No users found.</td>
            </tr>
          ) : (
            filteredUsers.map((user) => (
              <tr key={user.id}>
                <td>{user.id}</td>
                <td>{user.username}</td>
                <td>
                  {user.created_at
                    ? new Date(user.created_at).toLocaleString()
                    : "-"}
                </td>
                <td>
                  <button
                    className="users-action-btn delete"
                    onClick={() => handleDelete(user.id)}
                  >
                    Delete
                  </button>
                  <button
                    className="users-action-btn reset"
                    onClick={() => handleResetPassword(user.id)}
                  >
                    Reset Password
                  </button>
                  {resetUserId === user.id && (
                    <form
                      className="users-reset-form"
                      onSubmit={handleResetPasswordSubmit}
                      style={{ display: "inline-block", marginLeft: 8 }}
                    >
                      <input
                        type="password"
                        value={resetPassword}
                        onChange={(e) => setResetPassword(e.target.value)}
                        placeholder="New password"
                        minLength={6}
                        className="users-reset-input"
                        autoFocus
                      />
                      <button
                        type="submit"
                        className="users-action-btn reset"
                        disabled={resetLoading}
                        style={{ marginLeft: 4 }}
                      >
                        {resetLoading ? "Saving..." : "Save"}
                      </button>
                      <button
                        type="button"
                        className="users-action-btn delete"
                        onClick={() => setResetUserId(null)}
                        style={{ marginLeft: 4 }}
                      >
                        Cancel
                      </button>
                    </form>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
