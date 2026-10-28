import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaPenNib, FaStar, FaCompass, FaUserEdit } from 'react-icons/fa';
import DashboardShell from './DashboardShell';
import { NotificationsPanel } from './NotificationsPanel';
import { useNotifications } from './hooks';
import DashboardOverview, { useDashboardData, OverviewStatsRow } from './StatsOverview';

const ReaderDashboard = ({ user }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const navigate = useNavigate();
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const { stats, activity, topPosts, drafts, loading: overviewLoading } = useDashboardData();

  return (
    <DashboardShell
      user={user}
      unreadCount={unreadCount}
      tabs={[
        { id: 'overview', label: 'Overview' },
        { id: 'welcome', label: 'Community' },
        { id: 'notifications', label: 'Notifications' }
      ]}
      active={activeTab}
      onSelect={setActiveTab}
      metrics={<OverviewStatsRow stats={stats} />}
    >
      {activeTab === 'overview' && (
        <DashboardOverview
          stats={stats}
          activity={activity}
          topPosts={topPosts}
          drafts={drafts}
          loading={overviewLoading}
          quickActions={[
            { label: 'Browse Stories', icon: FaCompass, to: '/' },
            { label: 'Edit Profile', icon: FaUserEdit, to: '/profile' }
          ]}
        />
      )}

      {activeTab === 'welcome' && (
        <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="welcome-hero glass-card">
            <h3 style={{ fontSize: '1.6rem', fontWeight: '700', margin: 0 }}>
              Explore the <span className="gradient-text">BlogHub</span> Community
            </h3>
            <p style={{ color: 'var(--text-secondary)', margin: '10px 0 0', lineHeight: '1.6' }}>
              Discover unique voices, trending articles, and stories from writers around the world.
            </p>
            <button
              className="btn-submit"
              style={{ width: 'auto', marginTop: '20px' }}
              onClick={() => navigate('/')}
            >
              <FaPenNib style={{ marginRight: '8px' }} /> Browse Stories
            </button>
          </div>

          <div className="community-guidelines glass-card">
            <h4 className="footer-links-title" style={{ color: 'var(--text-primary)', marginBottom: '16px' }}>
              <FaStar /> Community Guidelines
            </h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '12px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              <li>&bull; Be respectful and kind in all comments and interactions.</li>
              <li>&bull; No hate speech, harassment, or personal attacks.</li>
              <li>&bull; Content that infringes copyright will be removed.</li>
              <li>&bull; Use the report feature to flag content that violates guidelines.</li>
              <li>&bull; Spam, bots, and fake accounts are not tolerated.</li>
            </ul>
          </div>
        </div>
      )}

      {activeTab === 'notifications' && (
        <NotificationsPanel notifications={notifications} onMarkRead={markRead} onMarkAllRead={markAllRead} />
      )}
    </DashboardShell>
  );
};

export default ReaderDashboard;