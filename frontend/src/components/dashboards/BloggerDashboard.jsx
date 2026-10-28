import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaEdit, FaExternalLinkAlt, FaTrashAlt, FaCheck, FaStar, FaUsers
} from 'react-icons/fa';
import api from '../../api/api';
import { useAlert } from '../../context/AlertContext';
import DashboardShell from './DashboardShell';
import { NotificationsPanel } from './NotificationsPanel';
import { AnalyticsView } from './AnalyticsPanels';
import { useNotifications } from './hooks';
import DashboardOverview, { useDashboardData, OverviewStatsRow } from './StatsOverview';
import { formatDate, MetricCard } from './common';

export const MonetizationSection = () => {
  const monetization = {
    adRevenue: 1247.83,
    sponsorPayouts: 520.0,
    paidSubscribers: 89,
    netEarnings: 1767.83,
    recentPayouts: [
      { id: 1, source: 'Ad Placement - Sep 1', amount: 415.94, status: 'Paid', date: 'Sep 03, 2026' },
      { id: 2, source: 'Sponsor: TechCorp', amount: 520.0, status: 'Paid', date: 'Aug 28, 2026' },
      { id: 3, source: 'Ad Placement - Aug 1', amount: 402.31, status: 'Paid', date: 'Aug 03, 2026' },
      { id: 4, source: 'Subscriber Revenue', amount: 225.50, status: 'Pending', date: 'Sep 10, 2026' }
    ]
  };

  return (
    <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '30px' }}>
      <div className="monetization-grid">
        <div className="monetization-card glass-card">
          <div className="monetization-icon"><FaStar /></div>
          <span className="monetization-label">Premium Subscribers</span>
          <span className="monetization-value">{monetization.paidSubscribers}</span>
        </div>
        <div className="monetization-card glass-card">
          <div className="monetization-icon"><FaUsers /></div>
          <span className="monetization-label">Ad Placement Revenue</span>
          <span className="monetization-value">${monetization.adRevenue.toFixed(2)}</span>
        </div>
        <div className="monetization-card glass-card">
          <div className="monetization-icon"><FaUsers /></div>
          <span className="monetization-label">Direct Sponsor Payouts</span>
          <span className="monetization-value">${monetization.sponsorPayouts.toFixed(2)}</span>
        </div>
        <div className="monetization-card glass-card">
          <div className="monetization-icon" style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#10b981' }}>
            <FaCheck />
          </div>
          <span className="monetization-label">Net Earnings</span>
          <span className="monetization-value" style={{ color: '#10b981' }}>${monetization.netEarnings.toFixed(2)}</span>
        </div>
      </div>

      <div className="db-table-wrapper">
        <h4 className="footer-links-title" style={{ color: 'var(--text-primary)', marginBottom: '16px' }}>
          Recent Payouts
        </h4>
        <table className="db-table">
          <thead>
            <tr>
              <th>Source</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {monetization.recentPayouts.map((payout) => (
              <tr key={payout.id}>
                <td style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{payout.source}</td>
                <td style={{ color: 'var(--success)', fontWeight: '600' }}>${payout.amount.toFixed(2)}</td>
                <td>
                  <span className={`status-badge ${payout.status.toLowerCase()}`}>
                    {payout.status}
                  </span>
                </td>
                <td>{payout.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const BloggerDashboard = ({ user, premium }) => {
  const { showAlert } = useAlert();
  const navigate = useNavigate();
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const { stats, activity, topPosts, drafts, loading: overviewLoading } = useDashboardData();

  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [subscriberCount, setSubscriberCount] = useState(null);
  const [monthlyTrends, setMonthlyTrends] = useState(null);
  const [categoryBreakdown, setCategoryBreakdown] = useState(null);
  const [audience, setAudience] = useState(null);
  const [myPosts, setMyPosts] = useState([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const [, trendsRes, catRes, audienceRes, profileRes] = await Promise.all([
          api.get('/api/analytics/dashboard'),
          api.get('/api/analytics/monthly-trends'),
          api.get('/api/analytics/category-breakdown'),
          api.get('/api/analytics/audience'),
          api.get('/api/users/profile')
        ]);
        if (cancelled) return;
        setMonthlyTrends(trendsRes.data);
        setCategoryBreakdown(catRes.data);
        setAudience(audienceRes.data);

        const profile = profileRes.data;
        const authored = await api.get('/api/posts', { params: { userId: profile.id, page: 0, size: 50 } });
        if (cancelled) return;
        setMyPosts(authored.data?.content || []);

        if (premium && profile?.id) {
          const subRes = await api.get(`/api/subscriptions/${profile.id}/status`);
          setSubscriberCount(subRes.data?.subscriberCount ?? null);
        }
      } catch (e) {
        console.error('Error fetching blogger dashboard data', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [premium]);

  const handlePublishToggle = async (postId) => {
    try {
      const response = await api.post(`/api/posts/${postId}/publish`);
      showAlert('Post published successfully!', 'success');
      setMyPosts((prev) => prev.map((p) => p.id === postId ? response.data : p));
    } catch (e) {
      showAlert(e.response?.data?.message || 'Error publishing post', 'error');
    }
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm('Are you sure you want to delete this blog post?')) return;
    try {
      await api.delete(`/api/posts/${postId}`);
      showAlert('Blog post deleted successfully', 'success');
      setMyPosts((prev) => prev.filter((p) => p.id !== postId));
    } catch (e) {
      showAlert(e.response?.data?.message || 'Error deleting post', 'error');
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-secondary)' }}>
        Loading dashboard details...
      </div>
    );
  }

  const tabs = [{ id: 'overview', label: 'Overview' }];
  tabs.push({ id: 'posts', label: 'My Stories' });
  if (premium) tabs.push({ id: 'monetization', label: 'Monetization' });
  tabs.push(
    { id: 'analytics', label: 'Audience Insights' },
    { id: 'notifications', label: 'Notifications' }
  );

  return (
    <DashboardShell
      user={user}
      unreadCount={unreadCount}
      tabs={tabs}
      active={activeTab}
      onSelect={setActiveTab}
      metrics={
        <>
          <OverviewStatsRow stats={stats} />
          {premium && (
            <MetricCard
              icon={<FaUsers />}
              value={subscriberCount ?? 0}
              label="Premium Subscribers"
            />
          )}
        </>
      }
    >
      {activeTab === 'overview' && (
        <DashboardOverview
          stats={stats}
          activity={activity}
          topPosts={topPosts}
          drafts={drafts}
          loading={overviewLoading}
        />
      )}

      {activeTab === 'posts' && (
        <div className="db-table-wrapper">
          {myPosts.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '30px 0' }}>
              You haven't written any stories yet.{' '}
              <button
                className="auth-link"
                onClick={() => navigate('/create')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-primary)' }}
              >
                Create your first post
              </button>
            </p>
          ) : (
            <table className="db-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Category</th>
                  <th>Created</th>
                  <th>Status</th>
                  <th>Tier</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {myPosts.map((post) => (
                  <tr key={post.id}>
                    <td style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{post.title}</td>
                    <td>{post.category?.name}</td>
                    <td>{formatDate(post.createdAt)}</td>
                    <td>
                      <span className={`status-badge ${post.status?.toLowerCase()}`}>
                        {post.status}
                      </span>
                    </td>
                    <td>
                      {post.premium ? (
                        <span className="role-tag" style={{ background: 'rgba(251, 191, 36, 0.15)', color: '#fbbf24' }}>
                          <FaStar size={10} style={{ marginRight: 4 }} /> Premium
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>Free</span>
                      )}
                    </td>
                    <td>
                      <div className="action-buttons-group">
                        <button
                          className="btn-action edit"
                          title="Edit"
                          onClick={() => navigate(`/edit/${post.id}`)}
                        >
                          <FaEdit />
                        </button>
                        {post.status === 'DRAFT' && (
                          <button
                            className="btn-action publish"
                            title="Publish"
                            onClick={() => handlePublishToggle(post.id)}
                          >
                            <FaCheck />
                          </button>
                        )}
                        <button
                          className="btn-action delete"
                          title="Delete"
                          onClick={() => handleDeletePost(post.id)}
                        >
                          <FaTrashAlt />
                        </button>
                        {post.status === 'PUBLISHED' && (
                          <button
                            className="btn-action edit"
                            title="View Story"
                            onClick={() => navigate(`/post/${post.id}`)}
                          >
                            <FaExternalLinkAlt />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'monetization' && premium && <MonetizationSection />}

      {activeTab === 'analytics' && (
        <AnalyticsView monthlyTrends={monthlyTrends} categoryBreakdown={categoryBreakdown} audience={audience} />
      )}

      {activeTab === 'notifications' && (
        <NotificationsPanel notifications={notifications} onMarkRead={markRead} onMarkAllRead={markAllRead} />
      )}
    </DashboardShell>
  );
};

export default BloggerDashboard;