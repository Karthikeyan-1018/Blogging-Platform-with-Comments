import React from 'react';

export const formatDate = (dateString) => {
  if (!dateString) return 'Draft';
  return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export const formatRelativeTime = (dateString) => {
  if (!dateString) return 'Just now';
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
  return formatDate(dateString);
};

export const normalizeNotifications = (content) =>
  (content || []).map((n) => ({
    id: n.id,
    message: n.message,
    title: n.title,
    time: formatRelativeTime(n.createdAt),
    read: n.read,
    type: n.type
  }));

export const MetricCard = ({ icon, value, label, iconStyle }) => (
  <div className="metric-card glass-card">
    <div className="metric-icon-box" style={iconStyle}>{icon}</div>
    <div className="metric-info">
      <span className="metric-value">{value}</span>
      <span className="metric-label">{label}</span>
    </div>
  </div>
);

export const RoleHeader = ({ user }) => (
  <div className="dashboard-title-row">
    <h1 className="hero-title" style={{ fontSize: '2.4rem', margin: 0 }}>
      Welcome, <span className="gradient-text">{user?.username}</span>
    </h1>
    <span className="role-tag" style={{ fontSize: '0.9rem', padding: '6px 14px', borderRadius: '20px' }}>
      {user?.role}
    </span>
  </div>
);