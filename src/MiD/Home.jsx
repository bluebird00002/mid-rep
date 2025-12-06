import React from "react";
import "./Home.css";
import {
  User,
  Key,
  Eye,
  EyeOff,
  CheckCircle,
  Copyright,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { motion, spring } from "framer-motion";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNotification } from "../hooks/useNotification";
import Notification from "../components/Notification";

function Home() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const { login } = useAuth();
  const navigate = useNavigate();
  const { notification, showError, showSuccess, hideNotification } =
    useNotification();

  const validateForm = () => {
    const newErrors = {};

    if (!username.trim()) {
      newErrors.username = "Username is required";
    } else if (username.length < 3) {
      newErrors.username = "Username must be at least 3 characters";
    }

    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const result = await login(username, password);
      setLoading(false);

      if (result.success) {
        showSuccess(`Welcome back, ${username}!`);
        setTimeout(() => {
          navigate("/MiD/Welcome");
        }, 1000);
      } else {
        showError(result.error || "Login failed");
      }
    } catch (error) {
      setLoading(false);
      showError(
        error.message ||
          "Cannot connect to server. Please ensure the backend is running."
      );
    }
  };

  const clearFieldError = (field) => {
    if (errors[field]) {
      setErrors({ ...errors, [field]: undefined });
    }
  };

  return (
    <>
      <div className="login-body">
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: [0, 1.2, 1] }}
          transition={{ duration: 1, type: spring, delay: 0.4 }}
          className="home-login-rows"
        >
          <div className="home-top-text">
            <div className="text-flex">
              Welcome! Now login below by providing your correct account
              credentials.
            </div>
            <div className="text-flex">
              You do not have an account?{" "}
              <Link to={"/MiD/CreateAccount"}>
                {" "}
                <span className="glow-link">Click Here</span>
              </Link>
            </div>
          </div>
        </motion.div>
        <div className="home-login-rows">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.4, ease: "easeOut" }}
            className="login-form-container"
          >
            <div className="log-form-sections header">
              M<span className="app-name-i">i</span>D Login
            </div>
            <div className="log-form-sections"></div>
            <div className="log-form-sections form-qns">
              <form onSubmit={handleSubmit}>
                <div className="form-grp-parent">
                  <div>
                    <div className="form-grp">
                      <label htmlFor="username">
                        <User size={20} />
                      </label>
                      <input
                        type="text"
                        name="username"
                        id="username"
                        placeholder="Username"
                        value={username}
                        onChange={(e) => {
                          setUsername(e.target.value);
                          clearFieldError("username");
                        }}
                        onBlur={() => {
                          if (!username.trim()) {
                            setErrors({
                              ...errors,
                              username: "Username is required",
                            });
                          }
                        }}
                        disabled={loading}
                        autoComplete="username"
                      />
                      {username && username.length >= 3 && (
                        <CheckCircle size={20} className="input-check" />
                      )}
                    </div>
                    {errors.username && (
                      <div className="form-error">
                        <AlertCircle size={16} />
                        {errors.username}
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="form-grp">
                      <label htmlFor="password">
                        <Key size={20} />
                      </label>
                      <input
                        type={showPassword ? "text" : "password"}
                        name="password"
                        id="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          clearFieldError("password");
                        }}
                        onBlur={() => {
                          if (!password) {
                            setErrors({
                              ...errors,
                              password: "Password is required",
                            });
                          }
                        }}
                        disabled={loading}
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        className="eye-toggle"
                        onClick={() => setShowPassword(!showPassword)}
                        tabIndex={-1}
                        disabled={loading}
                      >
                        {showPassword ? (
                          <EyeOff size={20} />
                        ) : (
                          <Eye size={20} />
                        )}
                      </button>
                    </div>
                    {errors.password && (
                      <div className="form-error">
                        <AlertCircle size={16} />
                        {errors.password}
                      </div>
                    )}
                  </div>
                </div>

                <div className="forgot-password-link">
                  <Link to={"/MiD/ForgotPassword"}>
                    <span className="forgot-password">Forgot password?</span>
                  </Link>
                </div>

                <div className="form-actions">
                  <button
                    type="submit"
                    className="login-btn"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 size={18} className="spinner" />
                        Logging in...
                      </>
                    ) : (
                      "Login"
                    )}
                  </button>
                </div>
              </form>
            </div>
            <Notification
              notification={notification}
              onClose={hideNotification}
            />
          </motion.div>
        </div>
        <div className="home-login-rows ver-space"></div>
        <div className="home-login-rows">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 2.4, ease: "easeOut" }}
            className="powered-by-animation"
          >
            <motion.div
              initial={{ opacity: 1 }}
              animate={{
                opacity: 1,
                x: [window.innerWidth + 500, -window.innerWidth - 500],
              }}
              transition={{ duration: 50, repeat: Infinity, delay: 1.2 }}
              className="animate-p1"
            >
              M<span className="app-name-i">i</span>D is created and powered by{" "}
              <span className="company-name">BluCia Labs</span> Tech Family.{" "}
              <span className="all-rights-reserved">
                <Copyright size={16} />
                2025 All Rights Reserved
              </span>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </>
  );
}

export default Home;
