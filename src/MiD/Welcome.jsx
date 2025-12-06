import "./Welcome.css";
import { motion } from "framer-motion";
import "@fontsource/orbitron";
import "@fontsource/audiowide";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

function Welcome() {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const skipElement = useRef(null);
  const [isNewUser, setIsNewUser] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [canProceed, setCanProceed] = useState(false);
  const [inputLocked, setInputLocked] = useState(false);
  const containerRef = useRef(null);
  const listenerRef = useRef(null);

  // Redirect if not logged in
  useEffect(() => {
    if (!user || !token) {
      navigate("/MiD/Home");
    } else {
      // Save that user is on Welcome page
      sessionStorage.setItem("mid_lastPage", "/MiD/Welcome");
    }
  }, [user, token, navigate]);

  // Detect if user is new
  useEffect(() => {
    const checkUserStatus = async () => {
      if (token) {
        try {
          const result = await api.isNewUser();
          console.log("🔍 isNewUser API result:", result);
          if (result.success) {
            console.log(
              "✅ User status determined - isNew:",
              result.data.isNew,
              "loginCount:",
              result.data.loginCount
            );
            setIsNewUser(result.data.isNew);
          }
        } catch (error) {
          console.error("Failed to check user status:", error);
          setIsNewUser(false);
        }
      }
    };

    checkUserStatus();
  }, [token]);

  // Detect if mobile device
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent
        )
      );
    };

    checkIfMobile();
  }, []);

  // Enable proceed after animation completes
  useEffect(() => {
    const timer = setTimeout(() => {
      setCanProceed(true);
    }, 7000);

    return () => clearTimeout(timer);
  }, []);

  const handleKeyPress = (e) => {
    if (canProceed && !isMobile && !inputLocked && isNewUser !== null) {
      setInputLocked(true);
      navigate("/MiD/AboutMiD", {
        state: { isNewUser, fromWelcome: true },
      });
    }
  };

  const handleTouchScreen = (e) => {
    if (canProceed && !inputLocked && isNewUser !== null) {
      setInputLocked(true);
      navigate("/MiD/AboutMiD", {
        state: { isNewUser, fromWelcome: true },
      });
    }
  };

  // Attach keyboard event listener to window
  useEffect(() => {
    if (canProceed && !isMobile && !inputLocked) {
      window.addEventListener("keydown", handleKeyPress);
      return () => {
        window.removeEventListener("keydown", handleKeyPress);
      };
    }
  }, [canProceed, isMobile, inputLocked, navigate, isNewUser]);

  return (
    <>
      <div
        className="welcome-container"
        onClick={handleTouchScreen}
        ref={containerRef}
      >
        {/* Desktop/Tablet Version */}
        <motion.div
          initial={{ opacity: 1, borderColor: "#ba710426" }}
          animate={{
            opacity: [0, 1, 1, 0, 1, 0, 1, 1, 0, 0, 1, 0, 1],
            y: [10, -10, 0, 10, -10, 0],
            x: [0, 0, 10, 0, 0, 10, 0],
            borderColor: "#ba7104ff",
          }}
          transition={{
            duration: 0.5,
            borderColor: { delay: 5 },
          }}
          className="glit-par-cont"
        >
          <motion.div
            initial={{ opacity: 0, color: "#ba710430" }}
            animate={{
              opacity: [0, 1, 0, 1],
              color: "#ba7104ff",
            }}
            transition={{
              duration: 1,
              delay: 1,
              color: { delay: 5 },
            }}
            className="welcome"
          >
            <motion.span
              initial={{ x: 0, y: 0 }}
              animate={{ x: [-230, -10, -60, 0], y: [150, 0, 0, 0] }}
              transition={{ duration: 2, delay: 2.5 }}
            >
              M
            </motion.span>
            <motion.span
              initial={{ opacity: 1, color: "#ba710430", x: 0, y: 0 }}
              animate={{
                opacity: 1,
                color: "#39CCCC",
                x: [200, -20, 0],
                y: [-180, 20, 0],
              }}
              transition={{
                duration: 0.5,
                delay: 2.5,
                color: { delay: 5 },
                x: { duration: 1.5, delay: 2.5 },
                y: { duration: 1.5, delay: 2.5 },
              }}
              className="app-name-i-2"
            >
              i
            </motion.span>{" "}
            <motion.span
              initial={{ x: 0, y: 0 }}
              animate={{ x: [280, 0], y: [70, 0] }}
              transition={{ duration: 2, delay: 2.5 }}
            >
              D
            </motion.span>
          </motion.div>
        </motion.div>

        {/* Mobile Version */}
        <motion.div
          initial={{ opacity: 1, borderColor: "#ba710426" }}
          animate={{
            opacity: [0, 1, 1, 0, 1, 0, 1, 1, 0, 0, 1, 0, 1],
            y: [10, -10, 0, 10, -10, 0],
            x: [0, 0, 10, 0, 0, 10, 0],
            borderColor: "#ba7104ff",
          }}
          transition={{
            duration: 0.5,
            borderColor: { delay: 5 },
          }}
          className="glit-par-cont-mobile"
        >
          <motion.div
            initial={{ opacity: 0, color: "#ba710430" }}
            animate={{
              opacity: [0, 1, 0, 1],
              color: "#ba7104ff",
            }}
            transition={{
              duration: 1,
              delay: 1,
              color: { delay: 5 },
            }}
            className="welcome"
          >
            <motion.span
              initial={{ x: 0, y: 0 }}
              animate={{ x: [-20, 0, -50, 0], y: [50, 0, 0, 0] }}
              transition={{
                x: { duration: 2, delay: 2.5 },
                y: { duration: 2, delay: 2.5 },
              }}
            >
              M
            </motion.span>
            <motion.span
              initial={{ opacity: 1, color: "#ba710430", x: 0, y: 0 }}
              animate={{
                opacity: 1,
                color: "#39CCCC",
                x: [50, -10, 0],
                y: [-50, 10, 0],
              }}
              transition={{
                duration: 0.5,
                delay: 2.5,
                color: { delay: 5 },
                x: { duration: 2, delay: 2.5 },
                y: { duration: 2, delay: 2.5 },
              }}
              className="app-name-i-2"
            >
              i
            </motion.span>
            <motion.span
              initial={{ x: 0, y: 0 }}
              animate={{ x: [50, 0], y: [70, 0] }}
              transition={{ duration: 2, delay: 2.5 }}
            >
              D
            </motion.span>
          </motion.div>
        </motion.div>

        {/* Instruction Text - Keyboard/Touch Adaptive */}
        <motion.div
          ref={skipElement}
          initial={{ opacity: 0 }}
          animate={{ opacity: canProceed ? 1 : 0 }}
          transition={{ delay: 7 }}
          className="skip-text-container"
        >
          <div className="skip-text">
            {isMobile
              ? "Touch the screen to continue"
              : "Press any key to continue"}
          </div>
          {isMobile && (
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="touch-gesture-icon"
            >
              <svg
                viewBox="0 0 100 100"
                width="40"
                height="40"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                {/* Finger pointer */}
                <circle cx="50" cy="30" r="8" fill="currentColor" />
                <line x1="50" y1="38" x2="50" y2="70" strokeLinecap="round" />
                {/* Ripple effect */}
                <circle cx="50" cy="60" r="15" opacity="0.3" />
              </svg>
            </motion.div>
          )}
        </motion.div>

        {/* Instruction Listener - Click handler only */}
        {canProceed && !inputLocked && (
          <div
            ref={listenerRef}
            className="instruction-listener"
            onClick={handleTouchScreen}
          />
        )}
      </div>
    </>
  );
}

export default Welcome;
