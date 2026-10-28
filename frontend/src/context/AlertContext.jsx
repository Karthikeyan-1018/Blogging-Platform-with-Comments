import React, { createContext, useState, useContext } from 'react';
import '../styles/Alert.css';
import { FaCheckCircle, FaExclamationCircle, FaInfoCircle, FaExclamationTriangle, FaTimes } from 'react-icons/fa';

const AlertContext = createContext(null);

export const AlertProvider = ({ children }) => {
  const [alerts, setAlerts] = useState([]);

  const showAlert = (message, type = 'info') => {
    const id = Date.now() + Math.random().toString(36).substring(2, 9);
    setAlerts((prev) => [...prev, { id, message, type, isClosing: false }]);
    
    // Auto-start fade out animation after 4 seconds
    setTimeout(() => {
      startClosing(id);
    }, 4000);
  };

  const startClosing = (id) => {
    setAlerts((prev) =>
      prev.map((alert) => (alert.id === id ? { ...alert, isClosing: true } : alert))
    );
    // Remove from array after CSS animation completes
    setTimeout(() => {
      setAlerts((prev) => prev.filter((alert) => alert.id !== id));
    }, 300);
  };

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}
      <div className="alert-container-host" role="status" aria-live="polite" aria-label="Notifications">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className={`alert-popup-card ${alert.type} ${alert.isClosing ? 'closing' : ''}`}
          >
            <div className="alert-popup-icon">
              {alert.type === 'success' && <FaCheckCircle color="var(--success)" />}
              {alert.type === 'error' && <FaExclamationCircle color="var(--error)" />}
              {alert.type === 'warning' && <FaExclamationTriangle color="var(--warning)" />}
              {alert.type === 'info' && <FaInfoCircle color="var(--accent-primary)" />}
            </div>
            <div className="alert-popup-message">{alert.message}</div>
            <button className="alert-popup-close" onClick={() => startClosing(alert.id)}>
              <FaTimes />
            </button>
          </div>
        ))}
      </div>
    </AlertContext.Provider>
  );
};

export const useAlert = () => useContext(AlertContext);
