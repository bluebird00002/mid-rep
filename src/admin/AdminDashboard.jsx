import React, { useState } from "react";
import AdminNav from "./components/AdminNav";
import UsersPanel from "./components/UsersPanel";
import ActivityPanel from "./components/ActivityPanel";
import PasswordPanel from "./components/PasswordPanel";
import "./AdminDashboard.css";

const PANELS = {
  users: "Users",
  activity: "Activity Log",
  password: "Change Password",
};

export default function AdminDashboard({ onLogout }) {
  const [panel, setPanel] = useState("users");

  return (
    <div className="admin-dashboard">
      <AdminNav panel={panel} setPanel={setPanel} onLogout={onLogout} />
      <div className="admin-content">
        {panel === "users" && <UsersPanel />}
        {panel === "activity" && <ActivityPanel />}
        {panel === "password" && <PasswordPanel />}
      </div>
    </div>
  );
}
