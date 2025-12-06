import React from "react";
import "./SessionTimeoutModal.css";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, LogOut, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useEffect, useState } from "react";

function SessionTimeoutModal() {
  const navigate = useNavigate();
  const { showSessionExpiredModal, logout, extendSession } = useAuth();
  const [countdown, setCountdown] = useState(30);

  useEffect(() => {
    if (!showSessionExpiredModal) {
      setCountdown(30);
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleLogout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [showSessionExpiredModal]);

  const handleLogout = () => {
    logout();
    navigate("/MiD/Home");
  };

  const handleStayLoggedIn = () => {
    extendSession();
  };

  return (
    <AnimatePresence>
      {showSessionExpiredModal && (
        <>
          {/* Backdrop */}
          <motion.div
            className="session-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleLogout}
          />

          {/* Modal */}
          <motion.div
            className="session-timeout-modal"
            initial={{ opacity: 0, scale: 0.8, y: -50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -50 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            <div className="modal-header">
              <Clock size={28} className="modal-icon" />
              <h2>Session Timeout</h2>
            </div>

            <div className="modal-content">
              <p className="session-message">
                Your session has been inactive for 10 minutes. For security
                reasons, you will be logged out.
              </p>

              <div className="countdown-section">
                <p className="countdown-label">Logging out in:</p>
                <motion.div
                  className="countdown-timer"
                  animate={{ scale: countdown <= 10 ? [1, 1.1, 1] : 1 }}
                  transition={{
                    duration: 0.5,
                    repeat: countdown <= 10 ? Infinity : 0,
                  }}
                >
                  {countdown}s
                </motion.div>
              </div>

              <p className="session-question">
                Would you like to stay logged in?
              </p>
            </div>

            <div className="modal-actions">
              <motion.button
                className="btn-stay-logged-in"
                onClick={handleStayLoggedIn}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <CheckCircle size={18} />
                Stay Logged In
              </motion.button>

              <motion.button
                className="btn-logout"
                onClick={handleLogout}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <LogOut size={18} />
                Logout
              </motion.button>
            </div>

            <div className="modal-footer">
              <p className="security-note">
                This is a security feature to protect your account.
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default SessionTimeoutModal;
