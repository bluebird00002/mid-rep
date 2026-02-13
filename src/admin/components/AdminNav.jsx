import React from "react";
import { User, List, KeyRound, LogOut } from "lucide-react";
import "./AdminNav.css";

export default function AdminNav({ panel, setPanel, onLogout }) {
  return (
    <nav className="admin-nav">
      <div className="admin-nav-title">Admin Dashboard</div>
      <ul className="admin-nav-list">
        <li className={panel === "users" ? "active" : ""} onClick={() => setPanel("users")}> <User size={18} /> Users </li>
        <li className={panel === "activity" ? "active" : ""} onClick={() => setPanel("activity")}> <List size={18} /> Activity Log </li>
        <li className={panel === "password" ? "active" : ""} onClick={() => setPanel("password")}> <KeyRound size={18} /> Change Password </li>
      </ul>
      <button className="admin-logout-btn" onClick={onLogout}><LogOut size={16} /> Logout</button>
    </nav>
  );
}
