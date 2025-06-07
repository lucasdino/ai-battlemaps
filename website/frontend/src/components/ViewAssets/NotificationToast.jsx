import React, { useEffect } from 'react';
import styles from '../../styles/ViewAssets';

const NotificationToast = ({ notification, onHide }) => {
  // Clear notifications after timeout
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => onHide(), 1000);
      return () => clearTimeout(timer);
    }
  }, [notification, onHide]);

  if (!notification) return null;

  return (
    <div style={{
      ...styles.message, 
      ...(notification.type === 'error' ? styles.error : styles.success),
      position: 'absolute',
      top: '15px',
      right: '15px',
      left: 'auto',
      transform: 'none',
      zIndex: 1000,
      boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
      maxWidth: '300px'
    }}>
      {notification.message}
    </div>
  );
};

export default NotificationToast; 