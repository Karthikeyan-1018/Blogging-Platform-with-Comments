import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/api';
import { FaRegCalendarAlt, FaRegClock, FaUser, FaPenNib } from 'react-icons/fa';
// import './PublicProfile.css';
import '../styles/PublicProfile.css';

const PublicProfile = () => {
  const { userId } = useParams();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const fetchProfileData = async () => {
      setLoading(true);
      setError(null);
      try {
        const profileResponse = await api.get(`/api/users/${userId}`);
        if (cancelled) return;
        setProfile(profileResponse.data);

        const postsResponse = await api.get('/api/posts', {
          params: { userId, status: 'PUBLISHED', sortBy: 'publishedAt', direction: 'desc', page: 0, size: 50 },
        });
        if (cancelled) return;
        setPosts(postsResponse.data.content || []);
      } catch (err) {
        if (!cancelled) {
          setError(err.response?.data?.message || 'Could not load this user profile.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchProfileData();
    return () => { cancelled = true; };
  }, [userId]);

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getPlaceholderImage = (id) => `https://picsum.photos/800/450?random=${id || 1}`;

  const isOwnProfile = currentUser && profile && String(currentUser.id) === String(profile.id);

  if (loading) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-secondary)' }}>
        Loading profile...
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="container">
        <div className="public-profile-error glass-card">
          <h3>{error || 'User not found'}</h3>
          <button className="btn-submit" style={{ width: 'auto', marginTop: '16px', padding: '10px 20px' }} onClick={() => navigate('/')}>
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container public-profile-page">
      {/* Profile Banner */}
      <section className="public-profile-banner glass-card">
        {profile.profileImage ? (
          <img src={profile.profileImage} alt={profile.username} className="public-profile-avatar" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
        ) : (
          <span className="public-profile-avatar public-profile-avatar-fallback"><FaUser size={32} /></span>
        )}
        <div className="public-profile-details">
          <h1 className="public-profile-name">{profile.fullName}</h1>
          <p className="public-profile-username">@{profile.username}</p>
          {profile.bio ? (
            <p className="public-profile-bio">{profile.bio}</p>
          ) : (
            <p className="public-profile-bio muted">This writer hasn't added a bio yet.</p>
          )}
          {isOwnProfile && (
            <button className="btn-submit own-profile-link" onClick={() => navigate('/profile')}>
              <FaPenNib size={12} /> Edit your profile
            </button>
          )}
        </div>
      </section>

      {/* Published Stories */}
      <section>
        <h2 className="section-title">Stories by @{profile.username} ({posts.length})</h2>
        {posts.length === 0 ? (
          <div className="glass-card" style={{ padding: '50px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            No published stories yet.
          </div>
        ) : (
          <div className="posts-grid">
            {posts.map((post) => (
              <article key={post.id} className="post-card glass-card">
                <div
                  className="post-card-image"
                  style={{ backgroundImage: `url(${post.featuredImage || getPlaceholderImage(post.id)})`, cursor: 'pointer' }}
                  onClick={() => navigate(`/post/${post.id}`)}
                >
                  <span className="post-card-category">{post.category?.name}</span>
                </div>
                <div className="post-card-body">
                  <div className="post-card-meta">
                    <span><FaRegCalendarAlt /> {formatDate(post.publishedAt)}</span>
                    <span><FaRegClock /> {post.readingTime || 5} min read</span>
                  </div>
                  <h3 className="post-card-title" onClick={() => navigate(`/post/${post.id}`)}>
                    {post.title}
                  </h3>
                  <p className="post-card-summary">
                    {post.summary || (post.content ? post.content.substring(0, 120) + '...' : '')}
                  </p>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default PublicProfile;
