import React from "react";
import "./CreateAccount.css";
import {
  User,
  Key,
  Eye,
  EyeOff,
  CheckCircle,
  X,
  AlertCircle,
  Loader2,
  Sparkles,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { useNotification } from "../hooks/useNotification";
import Notification from "../components/Notification";
import api from "../services/api";
import {
  validateUsernameFormat,
  generateUsernameSuggestion,
} from "../utils/usernameValidation";

// ============================================
// Constants
// ============================================
const DEBOUNCE_DELAY = 300;

// Check if suggestion is available (recursive) - uses API
const findAvailableSuggestion = async (suggestion, maxAttempts = 10) => {
  if (maxAttempts <= 0) return null;

  try {
    const result = await api.checkUsername(suggestion);
    if (result.available) {
      return suggestion;
    }
    return await findAvailableSuggestion(
      generateUsernameSuggestion(),
      maxAttempts - 1,
    );
  } catch (error) {
    console.error("Error checking suggestion:", error);
    return await findAvailableSuggestion(
      generateUsernameSuggestion(),
      maxAttempts - 1,
    );
  }
};

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

  // Username validation states
  const [usernameState, setUsernameState] = useState("neutral"); // neutral, checking, valid, invalid
  const [usernameError, setUsernameError] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  const usernameCheckRef = useRef(null);
  const suggestionCheckRef = useRef(null);

  const { register } = useAuth();
  const navigate = useNavigate();
  const { notification, showError, showSuccess, hideNotification } =
    useNotification();

  // Validate username against backend
  const validateUsernameWithBackend = useCallback(async (value) => {
    // First do client-side format validation
    const formatResult = validateUsernameFormat(value);
    if (!formatResult.valid) {
      setUsernameState("invalid");
      setUsernameError(formatResult.error);
      return false;
    }

    setUsernameState("checking");

    try {
      const result = await api.checkUsername(value);

      if (result.available) {
        setUsernameState("valid");
        setUsernameError(null);
        return true;
      } else {
        setUsernameState("invalid");
        setUsernameError(result.error || "Username is not available");
        return false;
      }
    } catch (error) {
      console.error("Username check error:", error);
      // On network error, show a message but don't block completely
      setUsernameState("neutral");
      setUsernameError(null);
      return null; // Unknown state
    }
  }, []);

  // Handle username change with debounce
  const handleUsernameChange = (e) => {
    const value = e.target.value;

    // Auto-convert to lowercase
    const lowerValue = value.toLowerCase();
    setUsername(lowerValue);

    // Clear any previous error
    if (errors.username) {
      setErrors({ ...errors, username: undefined });
    }

    // Clear previous debounce timer
    if (usernameCheckRef.current) {
      clearTimeout(usernameCheckRef.current);
    }

    // If empty, reset state
    if (!lowerValue.trim()) {
      setUsernameState("neutral");
      setUsernameError(null);
      setSuggestions([]);
      return;
    }

    // Quick client-side check for immediate feedback
    const formatResult = validateUsernameFormat(lowerValue);
    if (!formatResult.valid) {
      setUsernameState("invalid");
      setUsernameError(formatResult.error);
      return;
    }

    // Debounce backend check
    usernameCheckRef.current = setTimeout(() => {
      validateUsernameWithBackend(lowerValue);
    }, DEBOUNCE_DELAY);
  };

  // Generate suggestions
  const generateSuggestions = async () => {
    setLoadingSuggestions(true);
    setSuggestions([]);

    const newSuggestions = [];
    const checks = [];

    // Generate 3 suggestions and check availability in parallel
    for (let i = 0; i < 3; i++) {
      checks.push(
        findAvailableSuggestion(generateUsernameSuggestion(), 5).then(
          (suggestion) => {
            if (suggestion && !newSuggestions.includes(suggestion)) {
              newSuggestions.push(suggestion);
            }
          },
        ),
      );
    }

    await Promise.all(checks);
    setSuggestions(newSuggestions.slice(0, 3));
    setLoadingSuggestions(false);
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion) => {
    setUsername(suggestion);
    setUsernameState("checking");

    // Clear any previous timer
    if (usernameCheckRef.current) {
      clearTimeout(usernameCheckRef.current);
    }

    // Validate the suggestion
    usernameCheckRef.current = setTimeout(() => {
      validateUsernameWithBackend(suggestion);
    }, DEBOUNCE_DELAY);
  };

  // Clear field error
  const clearFieldError = (field) => {
    if (errors[field]) {
      setErrors({ ...errors, [field]: undefined });
    }
  };

  // Validate entire form
  const validateForm = () => {
    const newErrors = {};

    // Username validation
    const usernameValidation = validateUsernameFormat(username);
    if (!username.trim()) {
      newErrors.username = "Username is required";
    } else if (!usernameValidation.valid) {
      newErrors.username = usernameValidation.error;
    } else if (usernameState === "invalid") {
      newErrors.username = usernameError || "Username is not available";
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

  // Check if form is valid (for submit button)
  const isFormValid = useCallback(() => {
    const usernameValid = usernameState === "valid";
    const passwordValid = password.length >= 6;
    const confirmMatch =
      password === confirmPassword && confirmPassword.length > 0;
    const securityAnswersFilled =
      answer1.trim() && answer2.trim() && answer3.trim();

    return (
      usernameValid && passwordValid && confirmMatch && securityAnswersFilled
    );
  }, [usernameState, password, confirmPassword, answer1, answer2, answer3]);

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Final validation before submit
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
        null,
      );
      setLoading(false);

      if (result.success) {
        showSuccess(`Account created successfully! Welcome, ${username}!`);
        setTimeout(() => {
          navigate("/MiD/Welcome");
        }, 2000);
      } else {
        const msg = result.error || "Registration failed";
        if (msg.toLowerCase().includes("username")) {
          setErrors((prev) => ({ ...prev, username: msg }));
          setUsernameState("invalid");
          setUsernameError(msg);
        } else {
          showError(msg);
        }
      }
    } catch (error) {
      setLoading(false);
      showError(
        error.message ||
          "Cannot connect to server. Please ensure the backend is running.",
      );
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (usernameCheckRef.current) {
        clearTimeout(usernameCheckRef.current);
      }
      if (suggestionCheckRef.current) {
        clearTimeout(suggestionCheckRef.current);
      }
    };
  }, []);

  // Get border color based on state
  const getBorderColor = () => {
    switch (usernameState) {
      case "checking":
        return "#3B82F6"; // Blue
      case "valid":
        return "#10B981"; // Green
      case "invalid":
        return "#EF4444"; // Red
      default:
        return "rgba(255, 166, 0, 0.2)"; // Default orange
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
                  {/* Username Field */}
                  <div>
                    <div
                      className="form-grp username-field"
                      style={{ borderColor: getBorderColor() }}
                    >
                      <label htmlFor="username">
                        <User size={20} />
                      </label>
                      <input
                        type="text"
                        name="username"
                        id="username"
                        placeholder="Username (5-24 chars, lowercase letters, numbers, _ .)"
                        value={username}
                        onChange={handleUsernameChange}
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
                      {/* Status Icon */}
                      {username &&
                        (usernameState === "checking" ? (
                          <Loader2
                            size={20}
                            className="input-check input-check-loading spinner"
                          />
                        ) : usernameState === "valid" ? (
                          <CheckCircle
                            size={20}
                            className="input-check input-check-success"
                          />
                        ) : usernameState === "invalid" ? (
                          <X
                            size={20}
                            className="input-check input-check-error"
                          />
                        ) : null)}
                    </div>

                    {/* Error Message */}
                    {usernameError && (
                      <div className="form-error">
                        <AlertCircle size={16} />
                        {usernameError}
                      </div>
                    )}

                    {/* Success Message */}
                    {usernameState === "valid" && !usernameError && (
                      <div className="form-hint success">
                        <CheckCircle size={14} />
                        Username is available.
                      </div>
                    )}

                    {/* Suggestions Section */}
                    {(usernameState === "invalid" ||
                      usernameState === "neutral" ||
                      !username) && (
                      <div className="suggestions-section">
                        <button
                          type="button"
                          className="generate-btn"
                          onClick={generateSuggestions}
                          disabled={loadingSuggestions}
                        >
                          {loadingSuggestions ? (
                            <>
                              <Loader2 size={14} className="spinner" />
                              Generating...
                            </>
                          ) : (
                            <>
                              <Sparkles size={14} />
                              Generate for me
                            </>
                          )}
                        </button>

                        {suggestions.length > 0 && (
                          <div className="suggestions-list">
                            {suggestions.map((suggestion, index) => (
                              <button
                                key={index}
                                type="button"
                                className="suggestion-btn"
                                onClick={() =>
                                  handleSuggestionClick(suggestion)
                                }
                              >
                                {suggestion}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Password Field */}
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

                  {/* Confirm Password Field */}
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

                  {/* Security Questions */}
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
                    disabled={loading || !isFormValid()}
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
