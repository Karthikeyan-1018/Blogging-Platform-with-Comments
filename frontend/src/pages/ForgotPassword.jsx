import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/api';
import { useAlert } from '../context/AlertContext';
import '../styles/Auth.css';

const ForgotPassword = () => {
  const { showAlert } = useAlert();
  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetToken, setResetToken] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setResetToken('');
    if (!identifier.trim()) {
      showAlert('Please enter your username or email', 'warning');
      return;
    }
    setLoading(true);
    try {
      const response = await api.post('/api/auth/forgot-password', { usernameOrEmail: identifier.trim() });
      showAlert('Password reset token generated.', 'success');
      if (response.data?.resetToken) {
        setResetToken(response.data.resetToken);
      }
    } catch (err) {
      showAlert(err.response?.data?.message || 'Unable to generate reset token', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card glass-card animate-fade-in">
        <div className="auth-header">
          <h2 className="auth-title">Forgot Password</h2>
          <p className="auth-subtitle">Enter your username or email to receive a reset token</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Username or Email</label>
            <input
              type="text"
              className="form-input"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="e.g. johndoe"
              disabled={loading}
              id="forgot-identifier-input"
            />
          </div>

          <button type="submit" className="btn-submit" disabled={loading}>
            {loading ? 'Generating...' : 'Generate Reset Token'}
          </button>
        </form>

        {resetToken && (
          <div
            style={{
              marginTop: '18px',
              padding: '14px',
              borderRadius: '10px',
              background: 'rgba(108, 99, 255, 0.1)',
              border: '1px solid rgba(108, 99, 255, 0.3)',
              fontSize: '0.9rem'
            }}
          >
            <p style={{ color: 'var(--text-secondary)', margin: '0 0 8px' }}>
              Demo mode: your reset token is displayed below. Use it on the reset password page (valid for 24 hours).
            </p>
            <code style={{ wordBreak: 'break-all', color: 'var(--accent-primary)' }}>{resetToken}</code>
          </div>
        )}

        {resetToken && (
          <div className="auth-footer" style={{ marginTop: '16px' }}>
            <Link to="/reset-password" className="auth-link">
              Go to Reset Password
            </Link>
          </div>
        )}

        <div className="auth-footer">
          Remembered your password?{' '}
          <Link to="/login" className="auth-link">
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;