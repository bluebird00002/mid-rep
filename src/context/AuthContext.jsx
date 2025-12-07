import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
} from "react";
import api from "../services/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem("mid_token"));
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [showSessionExpiredModal, setShowSessionExpiredModal] = useState(false);
  const sessionTimeoutRef = useRef(null);
  const inactivityTimeoutRef = useRef(null);
  const SESSION_TIMEOUT = 5 * 60 * 1000; // 5 minutes

  // Initialize session on load
  useEffect(() => {
    // Set token in API service
    if (token) {
      api.setToken(token);
      // Verify token and get user info
      verifyToken();
      // Restore last activity from sessionStorage
      const savedActivity = sessionStorage.getItem("mid_lastActivity");
      if (savedActivity) {
        setLastActivity(parseInt(savedActivity));
      }
    } else {
      setLoading(false);
    }
  }, [token]);

  // Setup session timeout and inactivity monitoring
  useEffect(() => {
    if (!token || !user) {
      return;
    }

    // Clear existing timeouts
    if (sessionTimeoutRef.current) clearTimeout(sessionTimeoutRef.current);
    if (inactivityTimeoutRef.current)
      clearTimeout(inactivityTimeoutRef.current);

    // Function to show session expired modal
    const handleSessionExpired = () => {
      setShowSessionExpiredModal(true);
    };

    // Setup inactivity timeout (10 minutes)
    inactivityTimeoutRef.current = setTimeout(() => {
      handleSessionExpired();
    }, SESSION_TIMEOUT);

    // Add activity listeners
    const updateActivity = () => {
      const now = Date.now();
      setLastActivity(now);
      sessionStorage.setItem("mid_lastActivity", now.toString());

      // Clear and reset inactivity timeout
      if (inactivityTimeoutRef.current) {
        clearTimeout(inactivityTimeoutRef.current);
      }
      inactivityTimeoutRef.current = setTimeout(() => {
        handleSessionExpired();
      }, SESSION_TIMEOUT);
    };

    // Listen to user activity
    const activityEvents = [
      "mousedown",
      "keydown",
      "scroll",
      "touchstart",
      "click",
    ];
    activityEvents.forEach((event) => {
      window.addEventListener(event, updateActivity);
    });

    return () => {
      activityEvents.forEach((event) => {
        window.removeEventListener(event, updateActivity);
      });
      if (inactivityTimeoutRef.current)
        clearTimeout(inactivityTimeoutRef.current);
    };
  }, [token, user]);

  // Handle browser close
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (token && user) {
        // Clear session data on browser close
        sessionStorage.removeItem("mid_lastActivity");
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [token, user]);

  const verifyToken = async () => {
    try {
      const response = await api.verifyToken();
      if (response.success) {
        setUser(response.data.user);
      } else {
        logout();
      }
    } catch (error) {
      console.error("Token verification failed:", error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password) => {
    try {
      const response = await api.login(username, password);
      if (response.success && response.data) {
        const { token, user } = response.data;
        if (token && user) {
          localStorage.setItem("mid_token", token);
          sessionStorage.setItem("mid_lastActivity", Date.now().toString());
          setToken(token);
          api.setToken(token);
          setUser(user);
          setLastActivity(Date.now());
          return { success: true };
        }
      }
      return {
        success: false,
        error: response.error || response.message || "Login failed",
      };
    } catch (error) {
      return { success: false, error: error.message || "Login failed" };
    }
  };

  const register = async (username, password, securityAnswers) => {
    try {
      const response = await api.register(username, password, securityAnswers);
      if (response.success && response.data) {
        const { token, user } = response.data;
        if (token && user) {
          localStorage.setItem("mid_token", token);
          sessionStorage.setItem("mid_lastActivity", Date.now().toString());
          setToken(token);
          api.setToken(token);
          setUser(user);
          setLastActivity(Date.now());
          return { success: true };
        }
      }
      return {
        success: false,
        error: response.error || response.message || "Registration failed",
      };
    } catch (error) {
      return { success: false, error: error.message || "Registration failed" };
    }
  };

  const logout = () => {
    localStorage.removeItem("mid_token");
    sessionStorage.removeItem("mid_lastActivity");
    sessionStorage.removeItem("mid_lastPage");
    setToken(null);
    setUser(null);
    api.setToken(null);
    setShowSessionExpiredModal(false);
    if (inactivityTimeoutRef.current)
      clearTimeout(inactivityTimeoutRef.current);
  };

  const updateUser = (updates) => {
    if (user) {
      setUser({ ...user, ...updates });
    }
  };

  const extendSession = () => {
    setShowSessionExpiredModal(false);
    setLastActivity(Date.now());
    sessionStorage.setItem("mid_lastActivity", Date.now().toString());
    // Reset inactivity timer
    if (inactivityTimeoutRef.current) {
      clearTimeout(inactivityTimeoutRef.current);
    }
    inactivityTimeoutRef.current = setTimeout(() => {
      setShowSessionExpiredModal(true);
    }, SESSION_TIMEOUT);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        register,
        logout,
        updateUser,
        loading,
        token,
        lastActivity,
        showSessionExpiredModal,
        setShowSessionExpiredModal,
        extendSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
