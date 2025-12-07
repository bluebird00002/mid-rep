import React from "react";
import "./CreateAccount.css";
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
import api from "../services/api";

function CreateAccount() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [answer1, setAnswer1] = useState("");
  const [answer2, setAnswer2] = useState("");
  const [answer3, setAnswer3] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const { register } = useAuth();
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

    if (!confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    if (!answer1.trim()) {
      newErrors.answer1 = "Favorite color is required";
    }

    if (!answer2.trim()) {
      newErrors.answer2 = "Pet name is required";
    }

    if (!answer3.trim()) {
      newErrors.answer3 = "Birth city is required";
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
      const result = await register(
        username,
        password,
        {
          answer1,
          answer2,
          answer3,
        },
        null
      );
      setLoading(false);

      if (result.success) {
        showSuccess(`Account created successfully! Welcome, ${username}!`);
        setTimeout(() => {
          navigate("/MiD/Welcome");
        }, 2000);
      } else {
        showError(result.error || "Registration failed");
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
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.4 }}
          className="home-login-rows"
        >
          <p className="home-top-text">
            <p className="text-flex">
              Create your account by providing a username and strong password.
            </p>
            <p className="text-flex">
              Remember your credentials and use them during login.
            </p>
            <p className="text-flex">
              Already have an account?{" "}
              <Link to={"/MiD/Home"}>
                <span className="glow-link">Login Here</span>
              </Link>
            </p>
          </p>
        </motion.div>

        <div className="home-login-rows">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.4, ease: "easeOut" }}
            className="login-form-container"
          >
            <div className="log-form-sections header">
              M<span className="app-name-i">i</span>D Registration
            </div>

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
                        placeholder="Username (min 3 characters)"
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
                        placeholder="Password (min 6 characters)"
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          clearFieldError("password");
                          if (
                            confirmPassword &&
                            e.target.value !== confirmPassword
                          ) {
                            if (errors.confirmPassword?.includes("not match")) {
                              // Keep the error visible
                            }
                          }
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
                        autoComplete="new-password"
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

                  <div>
                    <div className="form-grp">
                      <label htmlFor="confirmPassword">
                        <Key size={20} />
                      </label>
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        name="confirmPassword"
                        id="confirmPassword"
                        placeholder="Confirm Password"
                        value={confirmPassword}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value);
                          clearFieldError("confirmPassword");
                        }}
                        onBlur={() => {
                          if (!confirmPassword) {
                            setErrors({
                              ...errors,
                              confirmPassword: "Please confirm your password",
                            });
                          } else if (password !== confirmPassword) {
                            setErrors({
                              ...errors,
                              confirmPassword: "Passwords do not match",
                            });
                          }
                        }}
                        disabled={loading}
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        className="eye-toggle"
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                        tabIndex={-1}
                        disabled={loading}
                      >
                        {showConfirmPassword ? (
                          <EyeOff size={20} />
                        ) : (
                          <Eye size={20} />
                        )}
                      </button>
                    </div>
                    {errors.confirmPassword && (
                      <div className="form-error">
                        <AlertCircle size={16} />
                        {errors.confirmPassword}
                      </div>
                    )}
                  </div>

                  <div className="security-section">
                    <div className="security-header">
                      <AlertCircle size={18} />
                      Security Questions
                    </div>

                    <div>
                      <label className="security-question-label">
                        What is your favorite color?
                      </label>
                      <div className="form-grp">
                        <input
                          type="text"
                          name="answer1"
                          id="answer1"
                          placeholder="e.g., Blue"
                          value={answer1}
                          onChange={(e) => {
                            setAnswer1(e.target.value);
                            clearFieldError("answer1");
                          }}
                          onBlur={() => {
                            if (!answer1.trim()) {
                              setErrors({
                                ...errors,
                                answer1: "This field is required",
                              });
                            }
                          }}
                          disabled={loading}
                        />
                        {answer1 && answer1.length > 0 && (
                          <CheckCircle size={20} className="input-check" />
                        )}
                      </div>
                      {errors.answer1 && (
                        <div className="form-error">
                          <AlertCircle size={16} />
                          {errors.answer1}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="security-question-label">
                        What is the name of your first pet?
                      </label>
                      <div className="form-grp">
                        <input
                          type="text"
                          name="answer2"
                          id="answer2"
                          placeholder="e.g., Fluffy"
                          value={answer2}
                          onChange={(e) => {
                            setAnswer2(e.target.value);
                            clearFieldError("answer2");
                          }}
                          onBlur={() => {
                            if (!answer2.trim()) {
                              setErrors({
                                ...errors,
                                answer2: "This field is required",
                              });
                            }
                          }}
                          disabled={loading}
                        />
                        {answer2 && answer2.length > 0 && (
                          <CheckCircle size={20} className="input-check" />
                        )}
                      </div>
                      {errors.answer2 && (
                        <div className="form-error">
                          <AlertCircle size={16} />
                          {errors.answer2}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="security-question-label">
                        In what city were you born?
                      </label>
                      <div className="form-grp">
                        <input
                          type="text"
                          name="answer3"
                          id="answer3"
                          placeholder="e.g., New York"
                          value={answer3}
                          onChange={(e) => {
                            setAnswer3(e.target.value);
                            clearFieldError("answer3");
                          }}
                          onBlur={() => {
                            if (!answer3.trim()) {
                              setErrors({
                                ...errors,
                                answer3: "This field is required",
                              });
                            }
                          }}
                          disabled={loading}
                        />
                        {answer3 && answer3.length > 0 && (
                          <CheckCircle size={20} className="input-check" />
                        )}
                      </div>
                      {errors.answer3 && (
                        <div className="form-error">
                          <AlertCircle size={16} />
                          {errors.answer3}
                        </div>
                      )}
                    </div>
                  </div>
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
                        Creating Account...
                      </>
                    ) : (
                      "Create Account"
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
      </div>
    </>
  );
}

export default CreateAccount;
