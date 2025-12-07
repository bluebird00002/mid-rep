import React from "react";
import "./SessionTimeoutModal.css";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, LogOut, Shield } from "lucide-react";
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
            transition={{ duration: 0.3 }}
            onClick={handleLogout}
          />

          {/* Modal */}
          <motion.div
            className="session-timeout-modal"
            initial={{ opacity: 0, scale: 0.7, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.7, y: 20 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
          >
            <div className="modal-card">
              {/* Header */}
              <div className="modal-header">
                <motion.div
                  className="header-icon"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                >
                  <Shield size={32} />
                </motion.div>
                <div>
                  <h2>Session Timeout</h2>
                  <p className="header-subtitle">Security Check</p>
                </div>
              </div>

              {/* Content */}
              <div className="modal-content">
                <p className="session-message">
                  Your session has been inactive for 5 minutes. You will be logged out for security.
                </p>

                {/* Countdown */}
                <motion.div
                  className="countdown-container"
                  animate={{ scale: countdown <= 10 ? [1, 1.05, 1] : 1 }}
                  transition={{ duration: 0.6, repeat: countdown <= 10 ? Infinity : 0 }}
                >
                  <span className="countdown-label">Logging out in</span>
                  <span className="countdown-number">{countdown}s</span>
                </motion.div>
              </div>

              {/* Actions */}
              <div className="modal-actions">
                <motion.button
                  className="btn btn-stay"
                  onClick={handleStayLoggedIn}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Shield size={18} />
                  <span>Stay Logged In</span>
                </motion.button>

                <motion.button
                  className="btn btn-logout"
                  onClick={handleLogout}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <LogOut size={18} />
                  <span>Logout</span>
                </motion.button>
              </div>

              {/* Footer */}
              <p className="modal-footer">
                <Clock size={12} />
                Auto logout in {countdown} seconds
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default SessionTimeoutModal;

