import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAlert } from '../context/AlertContext';
import '../styles/Auth.css';

const Register = () => {
  const { register, user, logout } = useAuth();
  const { showAlert } = useAlert();
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('READER'); // Default READER
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [pwdMetrics, setPwdMetrics] = useState({ length: false, upper: false, lower: false, number: false, special: false });
  const navigate = useNavigate();

  // Update password complexity metrics on input change
  useEffect(() => {
    setPwdMetrics({
      length: password.length >= 8,
      upper: /[A-Z]/.test(password),
      lower: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[^A-Za-z0-9]/.test(password),
    });
  }, [password]);

  const getPasswordStrength = () => {
    const passedCount = Object.values(pwdMetrics).filter(Boolean).length;
    if (passedCount <= 2) return { text: 'Weak', class: 'weak', level: 1 };
    if (passedCount <= 4) return { text: 'Medium', class: 'medium', level: 2 };
    return { text: 'Strong', class: 'strong', level: 3 };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Basic fields validation
    if (!username.trim() || !fullName.trim() || !email.trim() || !password.trim()) {
      setError('All fields are required');
      return;
    }

    if (username.length < 3 || username.length > 30) {
      setError('Username must be between 3 and 30 characters');
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    // Password validation checks
    const strength = getPasswordStrength();
    if (strength.level < 3) {
      setError('Password must be at least 8 characters long and contain uppercase, lowercase, numbers, and special characters.');
      return;
    }

    setLoading(true);
    try {
      await register({ username, fullName, email, password, role });
      showAlert('Registration successful! Redirecting to login page.', 'success');
      navigate('/login');
    } catch (err) {
      setError(err || 'Registration failed. Try a different username/email.');
    } finally {
      setLoading(false);
    }
  };

  const strength = getPasswordStrength();

  if (user) {
    return (
      <div className="auth-container">
        <div className="auth-card glass-card animate-fade-in" style={{ maxWidth: '520px' }}>
          <div className="auth-header">
            <h2 className="auth-title">You're already signed in</h2>
            <p className="auth-subtitle">
              Logged in as <strong>{user.fullName || user.username}</strong> ({user.role})
            </p>
          </div>
          <p className="already-loggedin-text">
            Accounts are one per login. Log out first to create a new account.
          </p>
          <div className="auth-actions">
            <button className="btn-submit" onClick={() => navigate('/dashboard')}>
              Go to Dashboard
            </button>
            <button
              type="button"
              className="btn-submit btn-logout-inline"
              onClick={async () => {
                await logout();
                showAlert('You have been logged out.', 'success');
                navigate('/register');
              }}
            >
              Log Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-card glass-card animate-fade-in" style={{ maxWidth: '520px' }}>
        <div className="auth-header">
          <h2 className="auth-title">Create Account</h2>
          <p className="auth-subtitle">Join us to share your unique voice with the world</p>
        </div>

        {error && <div className="error-banner">{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input
              type="text"
              className="form-input"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Jane Doe"
              disabled={loading}
              id="register-fullname"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Username</label>
            <input
              type="text"
              className="form-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. janedoe"
              disabled={loading}
              id="register-username"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. jane@example.com"
              disabled={loading}
              id="register-email"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Select Your Role</label>
            <div className="role-selector">
              <div
                className={`role-option ${role === 'READER' ? 'active' : ''}`}
                onClick={() => !loading && setRole('READER')}
              >
                Reader
              </div>
              <div
                className={`role-option ${role === 'BLOGGER' ? 'active' : ''}`}
                onClick={() => !loading && setRole('BLOGGER')}
              >
                Blogger
              </div>
              <div
                className={`role-option ${role === 'PREMIUM_BLOGGER' ? 'active' : ''}`}
                onClick={() => !loading && setRole('PREMIUM_BLOGGER')}
              >
                Premium
              </div>
            </div>
            <small className="form-hint">Admin and Moderator accounts are provisioned by the platform team and cannot be self-registered.</small>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={loading}
              id="register-password"
            />
            {password && (
              <div className="password-strength">
                <div className="strength-bar-wrapper">
                  <div className={`strength-bar ${password.length > 0 ? strength.class : ''}`} />
                  <div className={`strength-bar ${strength.level >= 2 ? strength.class : ''}`} />
                  <div className={`strength-bar ${strength.level >= 3 ? strength.class : ''}`} />
                </div>
                <span className="strength-text" style={{ color: strength.level === 3 ? 'var(--success)' : strength.level === 2 ? 'var(--warning)' : 'var(--error)' }}>
                  Password Strength: {strength.text}
                </span>
              </div>
            )}
          </div>

          <button type="submit" className="btn-submit" disabled={loading}>
            {loading ? 'Creating Account...' : 'Get Started'}
          </button>
        </form>

        <div className="auth-footer">
          Already have an account?{' '}
          <Link to="/login" className="auth-link">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
