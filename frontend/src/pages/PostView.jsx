import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/api';
import CommentSection from '../components/CommentSection';
import { useAlert } from '../context/AlertContext';
import { FaRegCalendarAlt, FaRegClock, FaEye, FaFlag, FaShareAlt, FaUserCheck, FaUserPlus, FaEdit, FaEyeSlash, FaHeart, FaRegHeart, FaStar, FaLock, FaUnlockAlt } from 'react-icons/fa';
import '../styles/PostView.css';

const PostView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin, isModerator } = useAuth();
  const { showAlert } = useAlert();
  
  const [post, setPost] = useState(null);
  const [relatedPosts, setRelatedPosts] = useState([]);
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Reporting Modal States
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('SPAM');
  const [reportDescription, setReportDescription] = useState('');
  const [reporting, setReporting] = useState(false);

  // Like States
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);

  // Premium subscription states
  const [subscribed, setSubscribed] = useState(false);
  const [subscribing, setSubscribing] = useState(false);

  useEffect(() => {
    fetchPostDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchPostDetails = async () => {
    setLoading(true);
    try {
      // Get the main post details
      const response = await api.get(`/api/posts/${id}`);
      const postData = response.data;
      setPost(postData);
      setLikeCount(postData.likes?.length || 0);

      // Check like status (if authenticated)
      try {
        const likeRes = await api.get(`/api/posts/${id}/like-status`);
        setLiked(!!likeRes.data.liked);
        setLikeCount(likeRes.data.likeCount);
      } catch (e) {
        console.warn('Could not load like status', e);
      }

      // Check premium subscription status for the author
      if (postData.premium && postData.authorId) {
        setSubscribed(false);
        try {
          const subRes = await api.get(`/api/subscriptions/${postData.authorId}/status`);
          setSubscribed(!!subRes.data.subscribed);
        } catch (e) {
          console.warn('Could not load subscription status', e);
        }
      }

      // Check follow status (if authenticated)
      if (user && postData.user) {
        try {
          const profileResponse = await api.get('/api/users/profile');
          const followingList = profileResponse.data.following || [];
          const isFollowing = followingList.some((f) => f.id === postData.user.id);
          setFollowing(isFollowing);
        } catch (e) {
          console.warn('Failed to load profile for following status check', e);
        }
      }

      // Fetch related posts from the same category
      if (postData.category) {
        const relatedRes = await api.get('/api/posts', {
          params: { categoryId: postData.category.id, page: 0, size: 4, status: 'PUBLISHED' }
        });
        const content = relatedRes.data.content || [];
        setRelatedPosts(content.filter((p) => p.id !== postData.id)); // filter out current post
      }
    } catch (e) {
      console.error(e);
      showAlert('Error fetching post details. Post might not exist.', 'error');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleLike = async () => {
    if (!user) {
      showAlert('Please log in to like articles', 'warning');
      return;
    }
    try {
      const response = await api.post(`/api/posts/${post.id}/like`);
      setLiked(!!response.data.liked);
      setLikeCount(response.data.likeCount);
      showAlert(response.data.message || 'Post liked', 'success');
    } catch (e) {
      showAlert(e.response?.data?.message || 'Error liking post', 'error');
    }
  };

  const handleSubscribe = async () => {
    if (!user) {
      showAlert('Please log in to subscribe to premium content', 'warning');
      navigate('/login');
      return;
    }
    setSubscribing(true);
    try {
      await api.post(`/api/subscriptions/${post.authorId}/subscribe`);
      setSubscribed(true);
      showAlert('Subscribed! Premium content unlocked.', 'success');
      await fetchPostDetails();
    } catch (e) {
      showAlert(e.response?.data?.message || 'Error subscribing to author', 'error');
    } finally {
      setSubscribing(false);
    }
  };

  const handleUnsubscribe = async () => {
    setSubscribing(true);
    try {
      await api.post(`/api/subscriptions/${post.authorId}/unsubscribe`);
      setSubscribed(false);
      showAlert('Unsubscribed successfully', 'success');
      await fetchPostDetails();
    } catch (e) {
      showAlert(e.response?.data?.message || 'Error unsubscribing', 'error');
    } finally {
      setSubscribing(false);
    }
  };

  const handleFollowToggle = async () => {
    if (!user) {
      showAlert('Please log in to follow authors', 'warning');
      return;
    }
    if (user.username === post.user?.username) {
      showAlert('You cannot follow yourself', 'warning');
      return;
    }
    try {
      const response = await api.post(`/api/users/${post.user.id}/follow`);
      const msg = response.data.message || '';
      setFollowing(msg.toLowerCase().includes('followed user'));
      showAlert(msg, 'success');
    } catch (e) {
      showAlert(e.response?.data?.message || 'Error following author', 'error');
    }
  };

  const handleReportSubmit = async (e) => {
    e.preventDefault();
    if (!reportDescription.trim()) {
      showAlert('Please write a short description explaining the issue', 'warning');
      return;
    }

    setReporting(true);
    try {
      await api.post('/api/reports', {
        reason: reportReason,
        description: reportDescription,
        blogPostId: post.id
      });
      showAlert('Thank you for reporting. Our moderation team will review this shortly.', 'success');
      setShowReportModal(false);
      setReportDescription('');
    } catch (err) {
      showAlert(err.response?.data?.message || 'Error submitting report', 'error');
    } finally {
      setReporting(false);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: post.title,
        text: post.summary,
        url: window.location.href,
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(window.location.href);
      showAlert('Link copied to clipboard!', 'success');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Draft';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getPlaceholderImage = (id) => {
    return `https://picsum.photos/800/450?random=${id || 1}`;
  };

  if (loading) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-secondary)' }}>
        Loading post contents...
      </div>
    );
  }

  if (!post) return null;

  return (
    <div className="container post-view-container animate-fade-in">
      {/* Left Column: Full Post Contents & CommentSection */}
      <main>
        <article>
          {/* Header Area */}
          <div className="post-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <h1 className="post-title" style={{ margin: 0 }}>{post.title}</h1>
              {post.premium && (
                <span className="premium-badge">
                  <FaStar /> Premium
                </span>
              )}
            </div>
            
            <div className="post-meta-strip">
              <div className="author-info">
                <div className="author-avatar">
                  {post.user?.fullName?.charAt(0) || post.user?.username?.charAt(0) || 'U'}
                </div>
                <div className="author-details">
                  <span className="author-name">
                    {post.user?.fullName || post.user?.username}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Author
                  </span>
                </div>
                {user && user.username !== post.user?.username && (
                  <button className="btn-follow" onClick={handleFollowToggle}>
                    {following ? <><FaUserCheck /> Following</> : <><FaUserPlus /> Follow</>}
                  </button>
                )}
              </div>

              <div className="post-stats">
                <span className="post-stat-item"><FaRegCalendarAlt /> {formatDate(post.publishedAt)}</span>
                <span className="post-stat-item"><FaRegClock /> {post.readingTime || 5} min read</span>
                <span className="post-stat-item"><FaEye /> {post.viewCount || 0} views</span>
              </div>
            </div>
          </div>

          {/* Featured Image Banner */}
          <div 
            className="post-featured-image"
            style={{ backgroundImage: `url(${post.featuredImage || getPlaceholderImage(post.id)})` }}
          />

          {/* Content Body */}
          <div 
            className="post-content"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />

          {/* Premium Paywall */}
          {post.premium && post.premiumLocked && (
            <div className="premium-paywall glass-card">
              <div className="paywall-icon"><FaLock /></div>
              <h3 className="paywall-title">
                <FaStar style={{ color: '#fbbf24', marginRight: 8 }} /> This is a premium story
              </h3>
              <p className="paywall-text">
                Subscribe to {post.user?.fullName || post.user?.username || 'this author'} to unlock the full
                article and support quality writing.
              </p>
              <div className="paywall-actions">
                <button className="btn-submit" onClick={handleSubscribe} disabled={subscribing}>
                  {subscribing ? 'Subscribing...' : (<><FaUnlockAlt style={{ marginRight: 8 }} /> Subscribe & Unlock</>)}
                </button>
              </div>
            </div>
          )}

          {post.premium && !post.premiumLocked && subscribed && (
            <div
              className="paywall-unlocked"
              style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}
            >
              <button className="pagination-btn" onClick={handleUnsubscribe} disabled={subscribing}>
                Unsubscribe
              </button>
            </div>
          )}

          {/* Custom Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="post-tags-list">
              {post.tags.map((tag) => (
                <span key={tag.id} className="post-tag">#{tag.name}</span>
              ))}
            </div>
          )}

          {/* Social Share & Report Controls */}
          <div className="post-actions-panel">
            <button className="pagination-btn" onClick={handleShare} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <FaShareAlt /> Share story
            </button>
            <button
              className="pagination-btn"
              onClick={handleToggleLike}
              style={{
                display: 'flex', gap: '8px', alignItems: 'center',
                color: liked ? 'var(--accent-primary)' : 'inherit'
              }}
              title={user ? (liked ? 'Unlike this article' : 'Like this article') : 'Log in to like this article'}
            >
              {liked ? <FaHeart color="var(--accent-primary)" /> : <FaRegHeart />} {likeCount} {likeCount === 1 ? 'like' : 'likes'}
            </button>
            {isAdmin && user.username !== post.user?.username && (
              <button 
                className="pagination-btn" 
                onClick={() => navigate(`/edit/${post.id}`)}
                style={{ display: 'flex', gap: '8px', alignItems: 'center', color: 'var(--accent-primary)' }}
              >
                <FaEdit /> Edit as Admin
              </button>
            )}
            {(isAdmin || isModerator) && (
              <button 
                className="btn-report" 
                onClick={async () => {
                  try {
                    await api.put(`/api/posts/${post.id}`, { visibility: 'PRIVATE' });
                    showAlert('Content has been hidden', 'success');
                    navigate('/');
                  } catch (err) {
                    showAlert('Error hiding content', 'error');
                  }
                }}
              >
                <FaEyeSlash /> Hide Content
              </button>
            )}
            {user && (
              <button className="btn-report" onClick={() => setShowReportModal(true)}>
                <FaFlag /> Report this article
              </button>
            )}
          </div>
        </article>

        {/* Dynamic Nested Comments Thread */}
        <CommentSection postId={post.id} />
      </main>

      {/* Right Column: Sidebar Related Articles */}
      <aside className="sidebar">
        <div className="sidebar-widget glass-card">
          <h3 className="footer-links-title" style={{ color: 'var(--text-primary)', marginBottom: '20px' }}>
            More from {post.category?.name}
          </h3>
          {relatedPosts.length === 0 ? (
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>No related articles found.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {relatedPosts.map((related) => (
                <div 
                  key={related.id} 
                  style={{ display: 'flex', flexDirection: 'column', gap: '6px', cursor: 'pointer' }}
                  onClick={() => navigate(`/post/${related.id}`)}
                >
                  <div 
                    style={{ 
                      height: '120px', 
                      backgroundImage: `url(${related.featuredImage || getPlaceholderImage(related.id)})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      borderRadius: '8px'
                    }}
                  />
                  <h4 style={{ fontSize: '0.95rem', fontWeight: '700', lineHeight: '1.4', color: 'var(--text-primary)' }}>
                    {related.title}
                  </h4>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {formatDate(related.publishedAt)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>

      {/* Flag Report Popup Overlay */}
      {showReportModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-card">
            <h3 className="modal-title">Report Content</h3>
            <form onSubmit={handleReportSubmit}>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label">Reason for reporting</label>
                <select 
                  className="form-input" 
                  value={reportReason} 
                  onChange={(e) => setReportReason(e.target.value)}
                  style={{ width: '100%', background: 'var(--bg-secondary)', color: 'white' }}
                >
                  <option value="SPAM">Spam</option>
                  <option value="COPYRIGHT">Copyright Infringement</option>
                  <option value="HARASSMENT">Harassment or Abuse</option>
                  <option value="HATE_SPEECH">Hate Speech</option>
                  <option value="MISINFORMATION">Misinformation</option>
                  <option value="OTHER">Other Issues</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Detailed explanation</label>
                <textarea
                  className="comment-textarea"
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                  placeholder="Explain why this content violates platform guidelines..."
                  rows={4}
                  style={{ width: '100%' }}
                />
              </div>

              <div className="modal-actions">
                <button 
                  type="button" 
                  className="pagination-btn" 
                  disabled={reporting} 
                  onClick={() => setShowReportModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-submit" 
                  disabled={reporting}
                  style={{ width: 'auto', marginTop: 0 }}
                >
                  {reporting ? 'Submitting...' : 'Submit Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PostView;
