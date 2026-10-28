import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/api';
import { useAlert } from '../context/AlertContext';
import '../styles/Auth.css';

const ResetPassword = () => {
  const navigate = useNavigate();
  const { showAlert } = useAlert();
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token.trim() || !newPassword || !confirmPassword) {
      showAlert('Please fill in all fields', 'warning');
      return;
    }
    if (newPassword.length < 8) {
      showAlert('Password must be at least 8 characters long', 'warning');
      return;
    }
    if (newPassword !== confirmPassword) {
      showAlert('Passwords do not match', 'warning');
      return;
    }

    setLoading(true);
    try {
      await api.post('/api/auth/reset-password', { token: token.trim(), newPassword });
      showAlert('Password reset successfully. You can now log in.', 'success');
      navigate('/login');
    } catch (err) {
      showAlert(err.response?.data?.message || 'Unable to reset password', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card glass-card animate-fade-in">
        <div className="auth-header">
          <h2 className="auth-title">Reset Password</h2>
          <p className="auth-subtitle">Enter the reset token and your new password</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Reset Token</label>
            <input
              type="text"
              className="form-input"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Paste the token from your email / reset page"
              disabled={loading}
              id="reset-token-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">New Password</label>
            <input
              type="password"
              className="form-input"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              disabled={loading}
              id="reset-new-password-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Confirm New Password</label>
            <input
              type="password"
              className="form-input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              disabled={loading}
              id="reset-confirm-password-input"
            />
          </div>

          <button type="submit" className="btn-submit" disabled={loading}>
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>

        <div className="auth-footer">
          <Link to="/forgot-password" className="auth-link">
            Request a new token
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;