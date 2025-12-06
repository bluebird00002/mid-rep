import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * Hook to save and restore page on refresh
 * Usage: usePageRestoration("/MiD/MyPage")
 */
export const usePageRestoration = (currentPage) => {
  const navigate = useNavigate();
  const { user, token, loading } = useAuth();

  // Save current page when user is logged in
  useEffect(() => {
    if (!loading && user && token) {
      sessionStorage.setItem("mid_lastPage", currentPage);
    }
  }, [user, token, loading, currentPage]);

  // Restore page on page load if user is logged in
  useEffect(() => {
    if (loading) return;

    if (user && token) {
      // User is logged in, check if there's a saved page to restore
      const lastPage = sessionStorage.getItem("mid_lastPage");
      // Don't navigate here, just let the component render
      // The component will handle its own logic
    } else {
      // User is not logged in, clear saved page
      sessionStorage.removeItem("mid_lastPage");
    }
  }, [user, token, loading, navigate]);
};

/**
 * Hook to restore user to their last page on app load
 * Usage: useRestoreLastPage() - place in a high-level component like App.jsx
 */
export const useRestoreLastPage = () => {
  const navigate = useNavigate();
  const { user, token, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (user && token) {
      // User is logged in, restore to last page
      const lastPage = sessionStorage.getItem("mid_lastPage");
      if (lastPage && lastPage !== "/") {
        navigate(lastPage, { replace: true });
      } else {
        // First time or no saved page, go to Welcome
        navigate("/MiD/Welcome", { replace: true });
      }
    } else {
      // User is not logged in
      const currentPath = window.location.pathname;
      const publicPages = [
        "/",
        "/MiD/Home",
        "/MiD/CreateAccount",
        "/MiD/ForgotPassword",
      ];

      if (!publicPages.includes(currentPath)) {
        // Try to access protected page without login
        navigate("/MiD/Home", { replace: true });
      }
    }
  }, [user, token, loading, navigate]);
};
