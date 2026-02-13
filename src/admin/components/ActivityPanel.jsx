
import React, { useEffect, useState } from "react";
import api from "../../services/api";
import "./ActivityPanel.css";

export default function ActivityPanel() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getActivityLog();
      setLogs(res.logs || res.data?.logs || []);
    } catch (err) {
      setError("Failed to load activity logs");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-panel activity-panel">
      <h2>Activity Log</h2>
      <button onClick={fetchLogs} className="activity-refresh-btn">Refresh</button>
      {loading && <div className="activity-loading">Loading activity logs...</div>}
      {error && <div className="activity-error">{error}</div>}
      <table className="activity-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Username</th>
            <th>Login Time</th>
            <th>IP Address</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {logs.length === 0 && !loading ? (
            <tr><td colSpan={5}>No activity logs found.</td></tr>
          ) : (
            logs.map((log) => (
              <tr key={log.id || log.login_id}>
                <td>{log.id || log.login_id}</td>
                <td>{log.username || log.user_id || "-"}</td>
                <td>{log.login_time ? new Date(log.login_time).toLocaleString() : "-"}</td>
                <td>{log.ip_address || "-"}</td>
                <td>{log.status || "-"}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
