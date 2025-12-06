import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, XCircle, AlertCircle, Info, X } from "lucide-react";
import "./Notification.css";

const Notification = ({ notification, onClose }) => {
  if (!notification) return null;

  const icons = {
    success: CheckCircle,
    error: XCircle,
    warning: AlertCircle,
    info: Info,
  };

  const Icon = icons[notification.type] || Info;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.9 }}
        className={`notification notification-${notification.type}`}
      >
        <div className="notification-content">
          <Icon className="notification-icon" size={20} />
          <div className="notification-message">
            <div className="notification-title">
              {notification.title || notification.type}
            </div>
            {notification.message && (
              <div className="notification-text">{notification.message}</div>
            )}
          </div>
        </div>
        {onClose && (
          <button className="notification-close" onClick={onClose}>
            <X size={16} />
          </button>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default Notification;
