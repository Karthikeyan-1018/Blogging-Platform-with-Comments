import React, { useState, useEffect } from 'react';
import { FaEye, FaFileAlt, FaComment, FaFlag, FaCheck, FaTimes, FaEyeSlash } from 'react-icons/fa';
import api from '../../api/api';
import { useAlert } from '../../context/AlertContext';
import DashboardShell from './DashboardShell';
import { NotificationsPanel } from './NotificationsPanel';
import { AnalyticsView } from './AnalyticsPanels';
import { useNotifications } from './hooks';
import { formatDate, formatRelativeTime, MetricCard } from './common';

const ModeratorDashboard = ({ user }) => {
  const { showAlert } = useAlert();
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();

  const [activeTab, setActiveTab] = useState('reports');
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({ totalViews: 0, totalBlogPosts: 0, totalComments: 0 });
  const [reports, setReports] = useState([]);
  const [pendingComments, setPendingComments] = useState([]);
  const [monthlyTrends, setMonthlyTrends] = useState(null);
  const [categoryBreakdown, setCategoryBreakdown] = useState(null);
  const [audience, setAudience] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const [metricsRes, reportsRes, pendingRes, trendsRes, catRes, audienceRes] = await Promise.all([
          api.get('/api/analytics/dashboard'),
          api.get('/api/reports'),
          api.get('/api/moderation/comments/pending', { params: { page: 0, size: 20 } }),
          api.get('/api/analytics/monthly-trends'),
          api.get('/api/analytics/category-breakdown'),
          api.get('/api/analytics/audience')
        ]);
        if (cancelled) return;
        setMetrics(metricsRes.data);
        setReports(reportsRes.data || []);
        setPendingComments(pendingRes.data?.content || []);
        setMonthlyTrends(trendsRes.data);
        setCategoryBreakdown(catRes.data);
        setAudience(audienceRes.data);
      } catch (e) {
        console.error('Error fetching moderator dashboard data', e);
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

      {activeTab === 'notifications' && (
        <NotificationsPanel notifications={notifications} onMarkRead={markRead} onMarkAllRead={markAllRead} />
      )}
    </DashboardShell>
  );
};

export default ModeratorDashboard;