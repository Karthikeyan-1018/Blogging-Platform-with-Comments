import React from 'react';
import { FaExclamationTriangle } from 'react-icons/fa';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo });
    console.error('Application error caught by ErrorBoundary:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          style={{
            minHeight: '70vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            padding: '40px',
            textAlign: 'center'
          }}
        >
          <div className="glass-card" style={{ maxWidth: '480px', padding: '40px' }}>
            <FaExclamationTriangle size={40} color="var(--warning)" style={{ marginBottom: '12px' }} />
            <h2 style={{ margin: '0 0 8px' }}>Something went wrong</h2>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              An unexpected error occurred while rendering this page. Try reloading the page, or go back
              and try again.
            </p>
            {this.state.error && (
              <p
                style={{
                  fontSize: '0.8rem',
                  color: 'var(--error)',
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: '8px',
                  padding: '10px',
                  wordBreak: 'break-word'
                }}
              >
                {String(this.state.error.message || this.state.error)}
              </p>
            )}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '16px' }}>
              <button className="btn-submit" style={{ width: 'auto', marginTop: 0 }} onClick={this.handleReset}>
                Try Again
              </button>
              <button
                className="pagination-btn"
                onClick={() => window.location.assign('/')}
                style={{ height: '44px' }}
              >
                Back to Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;