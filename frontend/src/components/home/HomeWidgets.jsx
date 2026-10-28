import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/api';
import {
  FaFire, FaUser, FaUsers, FaCommentAlt, FaEye, FaArrowRight, FaTrophy, FaClock, FaCrown
} from 'react-icons/fa';

const useHomeSidebarData = () => {
  const [data, setData] = useState({ trending: [], contributors: [], authors: [], comments: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const fetchAll = async () => {
      try {
        const [trending, contributors, authors, comments] = await Promise.all([
          api.get('/api/home/trending'),
          api.get('/api/home/top-contributors'),
          api.get('/api/home/recent-authors'),
          api.get('/api/home/recent-comments')
        ]);
        if (!cancelled) {
          setData({
            trending: trending.data || [],
            contributors: contributors.data || [],
            authors: authors.data || [],
            comments: comments.data || []
          });
        }
      } catch (err) {
        console.error('Error fetching home widgets:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchAll();
    return () => { cancelled = true; };
  }, []);

  return { ...data, loading };
};

const Avatar = ({ user, size = 40 }) => (
  user?.profileImage ? (
    <img
      src={user.profileImage}
      alt={user?.username || 'user'}
      className="home-widget-avatar"
      style={{ width: `${size}px`, height: `${size}px` }}
      onError={(e) => { e.currentTarget.style.display = 'none'; }}
    />
  ) : (
    <span className="home-widget-avatar home-widget-avatar-fallback" style={{ width: `${size}px`, height: `${size}px` }}>
      <FaUser size={size * 0.42} />
    </span>
  )
);

const WidgetShell = ({ icon, title, accent, children, empty }) => (
  <div className="sidebar-widget glass-card">
    <h3 className="home-widget-title">
      <span className="home-widget-icon" style={{ color: accent }}>{icon}</span>
      {title}
    </h3>
    {children}
    {empty && <p className="home-widget-empty">{empty}</p>}
  </div>
);

const TrendingNow = ({ posts, loading }) => {
  const navigate = useNavigate();
  return (
    <WidgetShell
      icon={<FaFire size={15} />}
      title="Trending Now"
      accent="var(--accent-secondary)"
      empty={(loading ? null : 'No trending posts yet.')}
    >
      {!loading && posts.length > 0 && (
        <ol className="home-trending-list">
          {posts.map((post, idx) => (
            <li key={post.id} className="home-trending-item">
              <span className={`home-trending-rank ${idx === 0 ? 'rank-top' : ''}`}>{idx + 1}</span>
              <button className="home-trending-link" onClick={() => navigate(`/post/${post.id}`)}>
                <span className="home-trending-title">{post.title}</span>
                <span className="home-trending-meta">
                  <FaEye size={10} /> {post.views || 0} views{post.category ? ` · ${post.category}` : ''}
                </span>
              </button>
            </li>
          ))}
        </ol>
      )}
    </WidgetShell>
  );
};

const RecentAuthors = ({ authors, loading, highlightAuthorId, onSelectAuthor }) => {
  return (
    <WidgetShell
      icon={<FaUsers size={15} />}
      title="Recent Authors"
      accent="var(--accent-primary)"
      empty={loading ? null : 'No authors yet.'}
    >
      {!loading && authors.length > 0 && (
        <ul className="home-author-list">
          {authors.map((author) => (
            <li key={author.id}>
              <button
                className={`home-author-item ${highlightAuthorId === author.id ? 'active' : ''}`}
                onClick={() => onSelectAuthor(author)}
              >
                <Avatar user={author} size={38} />
                <span className="home-author-meta">
                  <span className="home-author-name">{author.fullName || author.username}</span>
                  <span className="home-author-username">@{author.username}</span>
                </span>
                <FaArrowRight size={12} className="home-author-arrow" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </WidgetShell>
  );
};

const TopContributors = ({ contributors, loading }) => {
  const navigate = useNavigate();
  return (
    <WidgetShell
      icon={<FaCrown size={15} />}
      title="Top Contributors"
      accent="#fbbf24"
      empty={loading ? null : 'No contributors yet.'}
    >
      {!loading && contributors.length > 0 && (
        <ul className="home-contributor-list">
          {contributors.map((author, idx) => (
            <li key={author.id}>
              <button className="home-contributor-item" onClick={() => navigate(`/profile/user/${author.id}`)}>
                <span className="home-contributor-rank">
                  {idx === 0 ? <FaTrophy size={13} style={{ color: '#fbbf24' }} /> : idx + 1}
                </span>
                <Avatar user={author} size={34} />
                <span className="home-contributor-name">{author.fullName || author.username}</span>
                <span className="home-contributor-count">{author.postCount}<span> posts</span></span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </WidgetShell>
  );
};

const RecentComments = ({ comments, loading }) => {
  const navigate = useNavigate();
  const timeAgo = useCallback((dateString) => {
    if (!dateString) return '';
    const diffSec = Math.max(0, (Date.now() - new Date(dateString).getTime()) / 1000);
    if (diffSec < 60) return 'just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }, []);

  return (
    <WidgetShell
      icon={<FaCommentAlt size={14} />}
      title="Recent Comments"
      accent="#34d399"
      empty={loading ? null : 'No comments yet.'}
    >
      {!loading && comments.length > 0 && (
        <ul className="home-comment-list">
          {comments.map((comment) => (
            <li key={comment.id} className="home-comment-item">
              <Avatar user={comment.commenter} size={32} />
              <div className="home-comment-body">
                <p className="home-comment-content">{comment.content}</p>
                <span className="home-comment-meta">
                  <strong>{comment.commenter?.username}</strong>
                  <span>on </span>
                  <button
                    className="home-comment-post"
                    onClick={() => navigate(`/post/${comment.postId}`)}
                    title={comment.postTitle}
                  >
                    {comment.postTitle}
                  </button>
                  <span className="home-comment-time">
                    <FaClock size={9} /> {timeAgo(comment.createdAt)}
                  </span>
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </WidgetShell>
  );
};

export { useHomeSidebarData, TrendingNow, RecentAuthors, TopContributors, RecentComments };