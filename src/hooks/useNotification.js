import { useState, useCallback } from 'react';

export const useNotification = () => {
  const [notification, setNotification] = useState(null);

  const showNotification = useCallback((type, message, title = null, duration = 5000) => {
    setNotification({
      type,
      message,
      title: title || type.charAt(0).toUpperCase() + type.slice(1),
    });

    if (duration > 0) {
      setTimeout(() => {
        setNotification(null);
      }, duration);
    }
  }, []);

  const hideNotification = useCallback(() => {
    setNotification(null);
  }, []);

  const showSuccess = useCallback((message, title = 'Success', duration = 5000) => {
    showNotification('success', message, title, duration);
  }, [showNotification]);

  const showError = useCallback((message, title = 'Error', duration = 5000) => {
    showNotification('error', message, title, duration);
  }, [showNotification]);

  const showWarning = useCallback((message, title = 'Warning', duration = 5000) => {
    showNotification('warning', message, title, duration);
  }, [showNotification]);

  const showInfo = useCallback((message, title = 'Info', duration = 5000) => {
    showNotification('info', message, title, duration);
  }, [showNotification]);

  return {
    notification,
    showNotification,
    hideNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };
};

