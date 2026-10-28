import React, { useState, useEffect } from 'react';
import {
  FaEye, FaFileAlt, FaComment, FaUsers, FaFlag, FaCheck, FaTimes,
  FaEyeSlash, FaCog, FaUsersCog, FaChartBar, FaHistory
} from 'react-icons/fa';
import api from '../../api/api';
import { useAlert } from '../../context/AlertContext';
import DashboardShell from './DashboardShell';
import { NotificationsPanel } from './NotificationsPanel';
import { AnalyticsView } from './AnalyticsPanels';
import { useNotifications } from './hooks';
import { formatDate, formatRelativeTime, MetricCard } from './common';

const ALL_ROLES = ['ADMIN', 'MODERATOR', 'PREMIUM_BLOGGER', 'BLOGGER', 'READER'];

const getRoleName = (u) => (typeof u.role === 'string' ? u.role : u.role?.roleName);

const AdminDashboard = ({ user }) => {
  const { showAlert } = useAlert();
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();

  const [activeTab, setActiveTab] = useState('reports');
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({ totalViews: 0, totalBlogPosts: 0, totalComments: 0 });
  const [systemStats, setSystemStats] = useState(null);
  const [reports, setReports] = useState([]);
  const [pendingComments, setPendingComments] = useState([]);
  const [users, setUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [monthlyTrends, setMonthlyTrends] = useState(null);
  const [categoryBreakdown, setCategoryBreakdown] = useState(null);
  const [audience, setAudience] = useState(null);
  const [allowRegistrations, setAllowRegistrations] = useState(true);
  const [preModeration, setPreModeration] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const [
          metricsRes, reportsRes, pendingRes, trendsRes, catRes, audienceRes,
          sysStatsRes, usersRes, settingsRes, auditRes
        ] = await Promise.all([
          api.get('/api/analytics/dashboard'),
          api.get('/api/reports'),
          api.get('/api/moderation/comments/pending', { params: { page: 0, size: 20 } }),
          api.get('/api/analytics/monthly-trends'),
          api.get('/api/analytics/category-breakdown'),
          api.get('/api/analytics/audience'),
          api.get('/api/analytics/system-stats'),
          api.get('/api/users/admin/all'),
          api.get('/api/settings'),
          api.get('/api/admin/audit-logs', { params: { page: 0, size: 25 } })
        ]);
        if (cancelled) return;
        setMetrics(metricsRes.data);
        setReports(reportsRes.data || []);
        setPendingComments(pendingRes.data?.content || []);
        setMonthlyTrends(trendsRes.data);
        setCategoryBreakdown(catRes.data);
        setAudience(audienceRes.data);
        setSystemStats(sysStatsRes.data);
        setUsers(usersRes.data || []);
        setAuditLogs(auditRes.data?.content || []);
        const settings = settingsRes.data || {};
        setAllowRegistrations(settings.registrationOpen !== false);
        setPreModeration(settings.preModerationEnabled === true);
        setMaintenanceMode(settings.maintenanceMode === true);
      } catch (e) {
        console.error('Error fetching admin dashboard data', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const handleReportAction = async (reportId, status) => {
    try {
      await api.put(`/api/reports/${reportId}/status`, null, { params: { status } });
      showAlert(`Report marked as ${status.toLowerCase()}`, 'success');
      setReports((prev) => prev.filter((r) => r.id !== reportId));
    } catch (e) {
      showAlert(e.response?.data?.message || 'Error updating report status', 'error');
    }
  };

  const handleHideReportedContent = async (reportId) => {
    try {
      await api.put(`/api/reports/${reportId}/hide`);
      showAlert('Reported content hidden and report resolved', 'success');
      setReports((prev) => prev.filter((r) => r.id !== reportId));
    } catch (e) {
      showAlert(e.response?.data?.message || 'Error hiding content', 'error');
    }
  };

  const handleApproveComment = async (commentId) => {
    try {
      await api.post(`/api/comments/${commentId}/approve`);
      showAlert('Comment approved', 'success');
      setPendingComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch (e) {
      showAlert(e.response?.data?.message || 'Error approving comment', 'error');
    }
  };

  const handleRejectComment = async (commentId) => {
    try {
      await api.post(`/api/comments/${commentId}/reject`);
      showAlert('Comment rejected and hidden', 'success');
      setPendingComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch (e) {
      showAlert(e.response?.data?.message || 'Error rejecting comment', 'error');
    }
  };

  const handleToggleUserStatus = async (userId, currentStatus) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'BLOCKED' : 'ACTIVE';
    try {
      await api.put(`/api/users/${userId}/status`, null, { params: { status: newStatus } });
      showAlert(`User ${newStatus === 'ACTIVE' ? 'activated' : 'blocked'}`, 'success');
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, status: newStatus } : u));
    } catch (e) {
      showAlert(e.response?.data?.message || 'Error updating user status', 'error');
    }
  };

  const handleChangeUserRole = async (userId, role) => {
    try {
      await api.put(`/api/users/${userId}/role`, null, { params: { role } });
      showAlert(`Role updated to ${role}`, 'success');
      const usersRes = await api.get('/api/users/admin/all');
      setUsers(usersRes.data || []);
    } catch (e) {
      showAlert(e.response?.data?.message || 'Error updating role', 'error');
    }
  };

  const handleSaveSetting = async (key, newValue) => {
    try {
      await api.put(`/api/settings/${key}`, null, { params: { value: newValue } });
      showAlert('Setting updated successfully', 'success');
    } catch (e) {
      showAlert(e.response?.data?.message || 'Error updating setting', 'error');
      throw e;
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-secondary)' }}>
        Loading dashboard details...
      </div>
    );
  }

  return (
    <DashboardShell
      user={user}
      unreadCount={unreadCount}
      tabs={[
        { id: 'reports', label: `Content Reports (${reports.length})` },
        { id: 'moderation', label: `Comment Queue (${pendingComments.length})` },
        { id: 'analytics', label: 'Audience Insights' },
        { id: 'system-config', label: 'System Config' },
        { id: 'audit', label: 'Audit Logs' },
        { id: 'notifications', label: 'Notifications' }
      ]}
      active={activeTab}
      onSelect={setActiveTab}
      metrics={
        <>
          <MetricCard icon={<FaEye />} value={metrics.totalViews} label="Total Views" />
          <MetricCard icon={<FaFileAlt />} value={metrics.totalBlogPosts} label="Total Articles" />
          <MetricCard icon={<FaComment />} value={metrics.totalComments} label="Total Comments" />
          <MetricCard icon={<FaFlag />} value={reports.length} label="Open Reports" />
          <MetricCard icon={<FaUsers />} value={systemStats?.totalUsers ?? metrics.totalUsers} label="Registered Users" />
        </>
      }
    >
      {activeTab === 'reports' && (
        <div className="db-table-wrapper">
          {reports.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '30px 0' }}>
              No active content reports. Safe community!
            </p>
          ) : (
            <table className="db-table">
              <thead>
                <tr>
                  <th>Target Type</th>
                  <th>Reason</th>
                  <th>Description</th>
                  <th>Submitted</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((report) => (
                  <tr key={report.id}>
                    <td style={{ fontWeight: '600' }}>{report.comment ? 'Comment' : 'Blog Post'}</td>
                    <td>
                      <span className="role-tag" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#fca5a5' }}>
                        {report.reason}
                      </span>
                    </td>
                    <td style={{ maxWidth: '280px' }}>{report.description}</td>
                    <td>{formatDate(report.createdAt)}</td>
                    <td>
                      <div className="action-buttons-group">
                        <button
                          className="btn-action publish"
                          title="Hide Content & Resolve"
                          onClick={() => handleHideReportedContent(report.id)}
                        >
                          <FaEyeSlash size={14} />
                        </button>
                        <button
                          className="btn-action publish"
                          title="Resolve Report"
                          onClick={() => handleReportAction(report.id, 'RESOLVED')}
                        >
                          <FaCheck />
                        </button>
                        <button
                          className="btn-action delete"
                          title="Dismiss Report"
                          onClick={() => handleReportAction(report.id, 'REJECTED')}
                        >
                          <FaTimes />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'moderation' && (
        <div className="db-table-wrapper">
          {pendingComments.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '30px 0' }}>
              No comments awaiting moderation. All clear!
            </p>
          ) : (
            <table className="db-table">
              <thead>
                <tr>
                  <th>Commenter</th>
                  <th>Comment</th>
                  <th>On Article</th>
                  <th>Submitted</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingComments.map((comment) => (
                  <tr key={comment.id}>
                    <td style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                      {comment.user?.username || 'Unknown'}
                    </td>
                    <td style={{ maxWidth: '300px' }}>{comment.content}</td>
                    <td style={{ maxWidth: '180px' }}>{comment.blogPost?.title || '—'}</td>
                    <td>{formatRelativeTime(comment.createdAt)}</td>
                    <td>
                      <div className="action-buttons-group">
                        <button
                          className="btn-action publish"
                          title="Approve comment"
                          onClick={() => handleApproveComment(comment.id)}
                        >
                          <FaCheck />
                        </button>
                        <button
                          className="btn-action delete"
                          title="Reject comment"
                          onClick={() => handleRejectComment(comment.id)}
                        >
                          <FaTimes />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'analytics' && (
        <AnalyticsView monthlyTrends={monthlyTrends} categoryBreakdown={categoryBreakdown} audience={audience} />
      )}

      {activeTab === 'system-config' && (
        <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '30px' }}>
          <div className="config-section">
            <h4 className="footer-links-title" style={{ color: 'var(--text-primary)', marginBottom: '16px' }}>
              <FaCog /> System Configuration
            </h4>
            <div className="config-row">
              <div>
                <div className="config-label">Allow New Registrations</div>
                <div className="config-desc">When disabled, new accounts cannot be created</div>
              </div>
              <button
                className={`toggle-switch ${allowRegistrations ? 'on' : ''}`}
                onClick={() => {
                  setAllowRegistrations(!allowRegistrations);
                  handleSaveSetting('registrationOpen', String(!allowRegistrations)).catch(() => {
                    setAllowRegistrations(allowRegistrations);
                  });
                }}
              >
                <span className="toggle-knob" />
              </button>
            </div>
            <div className="config-row">
              <div>
                <div className="config-label">Pre-moderation Queue</div>
                <div className="config-desc">All new comments require moderator approval before appearing</div>
              </div>
              <button
                className={`toggle-switch ${preModeration ? 'on' : ''}`}
                onClick={() => {
                  setPreModeration(!preModeration);
                  handleSaveSetting('preModerationEnabled', String(!preModeration)).catch(() => {
                    setPreModeration(preModeration);
                  });
                }}
              >
                <span className="toggle-knob" />
              </button>
            </div>
            <div className="config-row">
              <div>
                <div className="config-label">Maintenance Mode</div>
                <div className="config-desc">Show maintenance banner to non-admin users</div>
              </div>
              <button
                className={`toggle-switch ${maintenanceMode ? 'on' : ''}`}
                onClick={() => {
                  setMaintenanceMode(!maintenanceMode);
                  handleSaveSetting('maintenanceMode', String(!maintenanceMode)).catch(() => {
                    setMaintenanceMode(maintenanceMode);
                  });
                }}
              >
                <span className="toggle-knob" />
              </button>
            </div>
          </div>

          <div className="config-section">
            <h4 className="footer-links-title" style={{ color: 'var(--text-primary)', marginBottom: '16px' }}>
              <FaUsersCog /> User Management
            </h4>
            <div className="db-table-wrapper">
              <table className="db-table user-management-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {u.profileImage ? (
                            <img src={u.profileImage} alt={u.username} style={{ width: '30px', height: '30px', borderRadius: '50%', objectFit: 'cover' }} />
                          ) : (
                            <div className="user-avatar-fallback">{u.username.charAt(0).toUpperCase()}</div>
                          )}
                          {u.username}
                        </div>
                      </td>
                      <td>{u.email}</td>
                      <td>
                        <select
                          className="role-select"
                          value={getRoleName(u) || ''}
                          onChange={(e) => handleChangeUserRole(u.id, e.target.value)}
                          disabled={u.username === 'admin'}
                        >
                          {ALL_ROLES.map((role) => (
                            <option key={role} value={role}>{role}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <span className={`status-badge ${u.status === 'ACTIVE' ? 'published' : 'draft'}`}>
                          {u.status}
                        </span>
                      </td>
                      <td>
                        <button
                          className={`btn-action ${u.status === 'ACTIVE' ? 'delete' : 'publish'}`}
                          title={u.status === 'ACTIVE' ? 'Block User' : 'Activate User'}
                          onClick={() => handleToggleUserStatus(u.id, u.status)}
                          disabled={u.username === 'admin'}
                        >
                          {u.status === 'ACTIVE' ? <FaTimes /> : <FaCheck />}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {systemStats && (
            <div className="config-section">
              <h4 className="footer-links-title" style={{ color: 'var(--text-primary)', marginBottom: '16px' }}>
                <FaChartBar /> System-wide Statistics
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
                <div className="stat-mini-card">
                  <span className="stat-mini-value">{systemStats.totalUsers}</span>
                  <span className="stat-mini-label">Total Users</span>
                </div>
                <div className="stat-mini-card">
                  <span className="stat-mini-value">{systemStats.totalPosts}</span>
                  <span className="stat-mini-label">Total Posts</span>
                </div>
                <div className="stat-mini-card">
                  <span className="stat-mini-value">{systemStats.totalComments}</span>
                  <span className="stat-mini-label">Total Comments</span>
                </div>
                <div className="stat-mini-card">
                  <span className="stat-mini-value">{systemStats.totalViews}</span>
                  <span className="stat-mini-label">Total Views</span>
                </div>
                <div className="stat-mini-card">
                  <span className="stat-mini-value" style={{ color: 'var(--error)' }}>{systemStats.unresolvedReports}</span>
                  <span className="stat-mini-label">Unresolved Reports</span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginTop: '24px' }}>
                <div>
                  <h5 style={{ color: 'var(--text-secondary)', marginBottom: '12px', fontSize: '0.85rem', textTransform: 'uppercase' }}>Users by Role</h5>
                  {Object.entries(systemStats.usersByRole || {}).map(([role, count]) => (
                    <div key={role} className="cat-breakdown-row">
                      <span className="cat-breakdown-label">{role}</span>
                      <div className="cat-breakdown-bar">
                        <div
                          style={{
                            width: `${(count / Math.max(1, systemStats.totalUsers)) * 100}%`,
                            background: 'var(--accent-primary)',
                            height: '100%'
                          }}
                        />
                      </div>
                      <span className="cat-breakdown-count">{count}</span>
                    </div>
                  ))}
                </div>
                <div>
                  <h5 style={{ color: 'var(--text-secondary)', marginBottom: '12px', fontSize: '0.85rem', textTransform: 'uppercase' }}>Posts by Status</h5>
                  {Object.entries(systemStats.postsByStatus || {}).map(([status, count]) => (
                    <div key={status} className="cat-breakdown-row">
                      <span className="cat-breakdown-label">{status}</span>
                      <div className="cat-breakdown-bar">
                        <div
                          style={{
                            width: `${(count / Math.max(1, systemStats.totalPosts)) * 100}%`,
                            background: 'var(--accent-secondary)',
                            height: '100%'
                          }}
                        />
                      </div>
                      <span className="cat-breakdown-count">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'audit' && (
        <div className="db-table-wrapper" style={{ marginTop: '20px' }}>
          <h4 className="footer-links-title" style={{ color: 'var(--text-primary)', marginBottom: '16px' }}>
            <FaHistory /> Recent Activity
          </h4>
          {auditLogs.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '30px 0' }}>
              No audit events recorded yet.
            </p>
          ) : (
            <table className="db-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>User</th>
                  <th>Action</th>
                  <th>Target</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log) => (
                  <tr key={log.id}>
                    <td>{formatRelativeTime(log.createdAt)}</td>
                    <td style={{ fontWeight: '600' }}>{log.actorUsername}</td>
                    <td>
                      <span className="role-tag" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#a5b4fc' }}>
                        {log.action}
                      </span>
                    </td>
                    <td>{log.targetType}:{log.targetId}</td>
                    <td style={{ maxWidth: '280px' }}>{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'notifications' && (
        <NotificationsPanel notifications={notifications} onMarkRead={markRead} onMarkAllRead={markAllRead} />
      )}
    </DashboardShell>
  );
};

export default AdminDashboard;