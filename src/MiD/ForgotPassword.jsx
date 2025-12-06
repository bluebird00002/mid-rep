import React from "react";
import "./forgotPassword.css";
import {
  User,
  CheckCircle,
  AlertCircle,
  Loader2,
  Key,
  Lock,
  Unlock,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useState } from "react";
import { useNotification } from "../hooks/useNotification";
import Notification from "../components/Notification";
import api from "../services/api";

function ForgotPassword() {
  const [step, setStep] = useState(1);
  const [username, setUsername] = useState("");
  const [usernameVerified, setUsernameVerified] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [verificationToken, setVerificationToken] = useState(null);
  const [securityAnswers, setSecurityAnswers] = useState({
    favoriteColor: "",
    petName: "",
    cityBorn: "",
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();
  const { notification, showError, showSuccess, showInfo, hideNotification } =
    useNotification();

  const validateStep1 = () => {
    const newErrors = {};
    if (!username.trim()) {
      newErrors.username = "Username is required";
    } else if (username.length < 3) {
      newErrors.username = "Username must be at least 3 characters";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors = {};
    if (!securityAnswers.favoriteColor.trim()) {
      newErrors.favoriteColor = "Please answer this question";
    }
    if (!securityAnswers.petName.trim()) {
      newErrors.petName = "Please answer this question";
    }
    if (!securityAnswers.cityBorn.trim()) {
      newErrors.cityBorn = "Please answer this question";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep3 = () => {
    const newErrors = {};
    if (!newPassword) {
      newErrors.newPassword = "New password is required";
    } else if (newPassword.length < 6) {
      newErrors.newPassword = "Password must be at least 6 characters";
    }
    if (!confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleStep1Submit = async (e) => {
    e.preventDefault();
    if (!validateStep1()) return;

    setLoading(true);
    setErrors({});
    try {
      const result = await api.verifyUsername(username);
      if (result.success) {
        setUsernameVerified(true);
        showInfo("Username verified! Please answer your security questions.");
        setStep(2);
      } else {
        showError(result.error || "Username not found");
        setErrors({ username: result.error || "Username not found" });
      }
    } catch (error) {
      showError(error.message || "Error verifying username");
      setErrors({ username: error.message || "Error verifying username" });
    } finally {
      setLoading(false);
    }
  };

  const handleStep2Submit = async (e) => {
    e.preventDefault();
    if (!validateStep2()) return;

    setLoading(true);
    setErrors({});
    try {
      const result = await api.verifySecurityAnswers(
        username,
        securityAnswers.favoriteColor,
        securityAnswers.petName,
        securityAnswers.cityBorn
      );
      if (result.success) {
        setVerificationToken(result.verificationToken);
        showInfo("Security answers verified! Set your new password.");
        setStep(3);
      } else {
        showError(result.error || "Security answers verification failed");
      }
    } catch (error) {
      showError(error.message || "Security answers verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleStep3Submit = async (e) => {
    e.preventDefault();
    if (!validateStep3()) return;

    if (!verificationToken) {
      showError("Verification token missing. Please start over.");
      resetProcess();
      return;
    }

    setLoading(true);
    setErrors({});
    try {
      const result = await api.resetPassword(
        username,
        verificationToken,
        newPassword,
        confirmPassword
      );
      if (result.success) {
        showSuccess("Password reset successfully! Redirecting to login...");
        setTimeout(() => {
          navigate("/MiD/Home");
        }, 1500);
      } else {
        showError(result.error || "Failed to reset password");
      }
    } catch (error) {
      showError(error.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  const clearFieldError = (field) => {
    if (errors[field]) {
      setErrors({ ...errors, [field]: undefined });
    }
  };

  const resetProcess = () => {
    setStep(1);
    setUsername("");
    setUsernameVerified(false);
    setSecurityAnswers({
      favoriteColor: "",
      petName: "",
      cityBorn: "",
    });
    setNewPassword("");
    setConfirmPassword("");
    setVerificationToken(null);
    setErrors({});
  };

  const handleBackStep = () => {
    if (step === 2) {
      setStep(1);
      setUsernameVerified(false);
      setSecurityAnswers({
        favoriteColor: "",
        petName: "",
        cityBorn: "",
      });
    } else if (step === 3) {
      setStep(2);
      setNewPassword("");
      setConfirmPassword("");
      setVerificationToken(null);
    }
    setErrors({});
  };

  const getStepStatus = (stepNum) => {
    if (stepNum < step) return "completed";
    if (stepNum === step) return "active";
    return "pending";
  };

  const renderProgressIndicator = () => {
    const progressPercent = ((step - 1) / 2) * 100;
    const step1Class = "progress-step " + getStepStatus(1);
    const step2Class = "progress-step " + getStepStatus(2);
    const step3Class = "progress-step " + getStepStatus(3);
    const conn1Class = "step-connector " + (step > 1 ? "completed" : "");
    const conn2Class = "step-connector " + (step > 2 ? "completed" : "");

    return (
      <div className="progress-indicator">
        <div className="progress-steps">
          <div className={step1Class}>
            <div className="step-circle">
              {step > 1 ? (
                <CheckCircle size={24} className="step-icon" />
              ) : (
                <span className="step-number">1</span>
              )}
            </div>
            <div className="step-label">Username</div>
          </div>
          <div className={conn1Class} />
          <div className={step2Class}>
            <div className="step-circle">
              {step > 2 ? (
                <CheckCircle size={24} className="step-icon" />
              ) : (
                <span className="step-number">2</span>
              )}
            </div>
            <div className="step-label">Verify</div>
          </div>
          <div className={conn2Class} />
          <div className={step3Class}>
            <div className="step-circle">
              {step > 3 ? (
                <CheckCircle size={24} className="step-icon" />
              ) : (
                <span className="step-number">3</span>
              )}
            </div>
            <div className="step-label">Reset</div>
          </div>
        </div>
        <div className="progress-bar-container">
          <motion.div
            className="progress-bar-fill"
            style={{ width: progressPercent + "%" }}
            animate={{ width: progressPercent + "%" }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
      </div>
    );
  };

  const getHeaderText = () => {
    if (step === 1) return "Forgot your password?";
    if (step === 2) return "Security Verification";
    return "Create New Password";
  };

  const getSubText = () => {
    if (step === 1) return "Enter your username to recover your account";
    if (step === 2)
      return "Answer your security questions to verify your identity";
    return "Set a strong new password";
  };

  return (
    <>
      <div className="login-body">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          {renderProgressIndicator()}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.4 }}
          className="home-login-rows"
        >
          <p className="home-top-text">
            <p className="text-flex">{getHeaderText()}</p>
            <p className="text-flex">{getSubText()}</p>
            {step === 1 && (
              <p className="text-flex">
                Don't have an account?{" "}
                <Link to={"/MiD/CreateAccount"}>
                  <span className="glow-link">Create One</span>
                </Link>
              </p>
            )}
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
              M<span className="app-name-i">i</span>D{" "}
              {step === 1 ? "Recovery" : step === 2 ? "Verification" : "Reset"}
            </div>

            <div className="log-form-sections form-qns">
              {step === 1 && (
                <form onSubmit={handleStep1Submit}>
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
                          placeholder="Enter your username"
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
                        {username &&
                          username.length >= 3 &&
                          !errors.username && (
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
                          Verifying...
                        </>
                      ) : (
                        <>
                          <Key size={18} />
                          Continue
                        </>
                      )}
                    </button>
                  </div>
                  <div className="back-to-login">
                    <Link to={"/MiD/Home"}>← Back to Login</Link>
                  </div>
                </form>
              )}

              {step === 2 && usernameVerified && (
                <form onSubmit={handleStep2Submit}>
                  <div className="security-info">
                    <CheckCircle size={20} className="verified-icon" />
                    <span>
                      Username verified: <strong>{username}</strong>
                    </span>
                  </div>
                  <div className="form-grp-parent">
                    <div>
                      <label className="security-question-label">
                        What is your favorite color?
                      </label>
                      <div className="form-grp">
                        <input
                          type="text"
                          placeholder="Answer here..."
                          value={securityAnswers.favoriteColor}
                          onChange={(e) => {
                            setSecurityAnswers({
                              ...securityAnswers,
                              favoriteColor: e.target.value,
                            });
                            clearFieldError("favoriteColor");
                          }}
                          disabled={loading}
                        />
                        {securityAnswers.favoriteColor &&
                          !errors.favoriteColor && (
                            <CheckCircle size={20} className="input-check" />
                          )}
                      </div>
                      {errors.favoriteColor && (
                        <div className="form-error">
                          <AlertCircle size={16} />
                          {errors.favoriteColor}
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
                          placeholder="Answer here..."
                          value={securityAnswers.petName}
                          onChange={(e) => {
                            setSecurityAnswers({
                              ...securityAnswers,
                              petName: e.target.value,
                            });
                            clearFieldError("petName");
                          }}
                          disabled={loading}
                        />
                        {securityAnswers.petName && !errors.petName && (
                          <CheckCircle size={20} className="input-check" />
                        )}
                      </div>
                      {errors.petName && (
                        <div className="form-error">
                          <AlertCircle size={16} />
                          {errors.petName}
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
                          placeholder="Answer here..."
                          value={securityAnswers.cityBorn}
                          onChange={(e) => {
                            setSecurityAnswers({
                              ...securityAnswers,
                              cityBorn: e.target.value,
                            });
                            clearFieldError("cityBorn");
                          }}
                          disabled={loading}
                        />
                        {securityAnswers.cityBorn && !errors.cityBorn && (
                          <CheckCircle size={20} className="input-check" />
                        )}
                      </div>
                      {errors.cityBorn && (
                        <div className="form-error">
                          <AlertCircle size={16} />
                          {errors.cityBorn}
                        </div>
                      )}
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
                          Verifying...
                        </>
                      ) : (
                        <>
                          <CheckCircle size={18} />
                          Verify Answers
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      className="back-btn"
                      onClick={handleBackStep}
                      disabled={loading}
                    >
                      ← Back
                    </button>
                  </div>
                </form>
              )}

              {step === 3 && (
                <form onSubmit={handleStep3Submit}>
                  <div className="security-info">
                    <CheckCircle size={20} className="verified-icon" />
                    <span>All verifications passed!</span>
                  </div>
                  <div className="form-grp-parent">
                    <div>
                      <div className="form-grp">
                        <label htmlFor="newPassword">
                          <Lock size={20} />
                        </label>
                        <input
                          type={showPassword ? "text" : "password"}
                          name="newPassword"
                          id="newPassword"
                          placeholder="New Password (min 6 characters)"
                          value={newPassword}
                          onChange={(e) => {
                            setNewPassword(e.target.value);
                            clearFieldError("newPassword");
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
                            <User size={20} />
                          ) : (
                            <Unlock size={20} />
                          )}
                        </button>
                      </div>
                      {errors.newPassword && (
                        <div className="form-error">
                          <AlertCircle size={16} />
                          {errors.newPassword}
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="form-grp">
                        <label htmlFor="confirmPassword">
                          <Lock size={20} />
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
                            <User size={20} />
                          ) : (
                            <Unlock size={20} />
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
                          Resetting...
                        </>
                      ) : (
                        <>
                          <Unlock size={18} />
                          Reset Password
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      className="back-btn"
                      onClick={handleBackStep}
                      disabled={loading}
                    >
                      ← Back
                    </button>
                  </div>
                </form>
              )}
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

export default ForgotPassword;
