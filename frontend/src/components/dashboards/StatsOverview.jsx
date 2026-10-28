import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaEye, FaFileAlt, FaHeart, FaComment, FaReply, FaUserPlus,
  FaCog, FaPenFancy, FaUserEdit, FaTrophy, FaBookOpen
} from 'react-icons/fa';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip
} from 'recharts';
import api from '../../api/api';
import { formatRelativeTime, MetricCard } from './common';

export const useDashboardData = () => {
  const [stats, setStats] = useState(null);
  const [activity, setActivity] = useState([]);
  const [topPosts, setTopPosts] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, activityRes, topRes, draftsRes] = await Promise.all([
        api.get('/api/dashboard/stats'),
        api.get('/api/dashboard/activity'),
        api.get('/api/dashboard/top-posts'),
        api.get('/api/dashboard/drafts')
      ]);
      setStats(statsRes.data);
      setActivity(activityRes.data || []);
      setTopPosts(topRes.data || []);
      setDrafts(draftsRes.data || []);
    } catch (e) {
      console.error('Failed to load dashboard overview', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { stats, activity, topPosts, drafts, loading, fetchData };
};

const ACTIVITY_ICONS = {
  LIKE: FaHeart,
  COMMENT: FaComment,
  REPLY: FaReply,
  FOLLOW: FaUserPlus,
  SYSTEM: FaCog,
  REPORT: FaCog
};

const ActivityIcon = ({ type }) => {
  const Icon = ACTIVITY_ICONS[type] || FaCog;
  return (
    <span className="activity-icon">
      <Icon />
    </span>
  );
};

export const ViewsTrendChart = ({ viewsTrend }) => {
  const data = (viewsTrend || []).map(({ date, views }) => {
    const d = new Date(date + 'T00:00:00');
    return {
      label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      views
    };
  });

  return (
    <div className="dashboard-panel">
      <h4 className="dashboard-panel-title"><FaEye /> Views &mdash; Last 30 Days</h4>
      {data.length === 0 ? (
        <p className="dashboard-empty">Not enough data yet.</p>
      ) : (
        <div className="trend-chart">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid stroke="rgba(179, 14, 47, 0.12)" strokeDasharray="3 3" />
              <XAxis
                dataKey="label"
                interval={6}
                tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 12,
                  color: 'var(--text-primary)'
                }}
                labelStyle={{ color: 'var(--text-primary)' }}
                formatter={(value) => [`${value} views`, 'Views']}
              />
              <Line
                type="monotone"
                dataKey="views"
                stroke="#b30e2f"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 4, fill: '#d4af37' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export const RecentActivityPanel = ({ activity }) => (
  <div className="dashboard-panel">
    <h4 className="dashboard-panel-title"><FaBookOpen /> Recent Activity</h4>
    {activity.length === 0 ? (
      <p className="dashboard-empty">No recent activity yet.</p>
    ) : (
      <ul className="activity-list">
        {activity.map((item) => (
          <li key={item.id} className="activity-item">
            <ActivityIcon type={item.type} />
            <div className="activity-body">
              <span className="activity-title">{item.title}</span>
              <span className="activity-message">{item.message}</span>
              <span className="activity-time">{formatRelativeTime(item.createdAt)}</span>
            </div>
          </li>
        ))}
      </ul>
    )}
  </div>
);

export const TopPostsPanel = ({ topPosts }) => {
  const navigate = useNavigate();
  return (
    <div className="dashboard-panel">
      <h4 className="dashboard-panel-title"><FaTrophy /> Top Posts</h4>
      {topPosts.length === 0 ? (
        <p className="dashboard-empty">Publish a story to start ranking.</p>
      ) : (
        <ol className="top-posts-list">
          {topPosts.map((post) => (
            <li key={post.id} className="top-post-item">
              <span className="top-post-rank">{post.rank}</span>
              <div className="top-post-body">
                <button
                  className="top-post-title"
                  title="View story"
                  onClick={() => post.publishedAt
                    ? navigate(`/post/${post.id}`)
                    : navigate(`/edit/${post.id}`)}
                >
                  {post.title}
                </button>
                <span className="top-post-stats">
                  <span><FaEye /> {post.views}</span>
                  <span><FaHeart /> {post.likes}</span>
                  <span><FaComment /> {post.comments}</span>
                </span>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
};

export const ContinueWritingPanel = ({ drafts }) => {
  const navigate = useNavigate();
  return (
    <div className="dashboard-panel">
      <h4 className="dashboard-panel-title"><FaPenFancy /> Continue Writing</h4>
      {drafts.length === 0 ? (
        <p className="dashboard-empty">No drafts in progress.</p>
      ) : (
        <ul className="drafts-list">
          {drafts.slice(0, 5).map((draft) => (
            <li key={draft.id} className="draft-item">
              <button className="draft-title" onClick={() => navigate(`/edit/${draft.id}`)}>
                {draft.title}
              </button>
              <span className="draft-meta">
                {draft.category || 'Uncategorized'}
                {draft.featuredImage ? ' \u00b7 Featured image' : ''}
                {draft.premium ? ' \u00b7 Premium' : ''}
              </span>
              <div className="draft-actions">
                <span className="draft-updated">Edited {formatRelativeTime(draft.updatedAt)}</span>
                <button className="btn-action edit" title="Continue editing" onClick={() => navigate(`/edit/${draft.id}`)}>
                  <FaPenFancy />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export const QuickActionsPanel = ({ actions }) => {
  const navigate = useNavigate();
  return (
    <div className="dashboard-panel">
      <h4 className="dashboard-panel-title">Quick Actions</h4>
      <div className="quick-actions">
        {(actions || []).map((action) => (
          <button
            key={action.label}
            className="quick-action-btn"
            onClick={() => action.onClick ? action.onClick() : navigate(action.to)}
          >
            {action.icon && <action.icon />}
            <span>{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export const OverviewStatsRow = ({ stats }) => (
  <>
    <MetricCard
      icon={<FaFileAlt />}
      value={stats?.totalPosts ?? 0}
      label="Total Posts"
    />
    <MetricCard
      icon={<FaEye />}
      value={stats?.totalViews ?? 0}
      label="Total Views"
    />
    <MetricCard
      icon={<FaHeart />}
      value={stats?.totalLikes ?? 0}
      label="Likes Received"
    />
    <MetricCard
      icon={<FaComment />}
      value={stats?.totalComments ?? 0}
      label="Comments"
    />
  </>
);

const DashboardOverview = ({
  stats,
  activity,
  topPosts,
  drafts,
  loading,
  quickActions = [
    { label: 'New Story', icon: FaPenFancy, to: '/create' },
    { label: 'Edit Profile', icon: FaUserEdit, to: '/profile' }
  ],
  renderMetrics
}) => {
  if (loading || !stats) {
    return (
      <div className="dashboard-empty" style={{ padding: '40px 0', textAlign: 'center' }}>
        Loading overview...
      </div>
    );
  }

  return (
    <div className="dashboard-overview">
      {renderMetrics && (
        <section className="metrics-grid overview-stats-row">
          {renderMetrics(stats)}
        </section>
      )}

      <div className="dashboard-grid">
        <div className="dashboard-grid-main">
          <ViewsTrendChart viewsTrend={stats.viewsTrend} />
          <div className="dashboard-grid-cols">
            <TopPostsPanel topPosts={topPosts} />
            <ContinueWritingPanel drafts={drafts} />
          </div>
        </div>
        <div className="dashboard-grid-side">
          <QuickActionsPanel actions={quickActions} />
          <RecentActivityPanel activity={activity} />
        </div>
      </div>
    </div>
  );
};

export default DashboardOverview;