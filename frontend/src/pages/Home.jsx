import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/api';
import { FaChevronLeft, FaChevronRight, FaRegCalendarAlt, FaRegClock, FaTags, FaFire, FaUser, FaHashtag } from 'react-icons/fa';
import { useHomeSidebarData, TrendingNow, RecentAuthors, TopContributors, RecentComments } from '../components/home/HomeWidgets';
import '../styles/Home.css';

const PAGE_SIZE = 6;

const Home = () => {
  const { user, isReader } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryParam = searchParams.get('query') || '';
  const tagParam = searchParams.get('tag') || '';

  const [posts, setPosts] = useState([]);
  const [featuredPosts, setFeaturedPosts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);

  // Pagination & Loading States
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);

  // User search states (shown alongside story results)
  const [userResults, setUserResults] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);

  // Sidebar widgets (Trending / Contributors / Authors / Comments)
  const {
    trending: trendingPosts,
    contributors,
    authors,
    comments,
    loading: widgetsLoading
  } = useHomeSidebarData();

  // Highlight a specific author's posts after clicking "Recent Authors"
  const [authorHighlightId, setAuthorHighlightId] = useState(null);

  const handleAuthorSelect = (author) => {
    setAuthorHighlightId(author.id);
    const latest = document.getElementById('latest-stories');
    if (latest) {
      latest.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Fetch Categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await api.get('/api/categories');
        setCategories(response.data || []);
      } catch (err) {
        console.error('Error fetching categories:', err);
      }
    };
    fetchCategories();
  }, []);

  // Fetch Posts when page, category, query, or tag changes
  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true);
      try {
        const params = {
          page: 0,
          size: PAGE_SIZE,
          status: 'PUBLISHED',
          sortBy: 'publishedAt',
          direction: 'desc'
        };

        if (selectedCategory) params.categoryId = selectedCategory;
        if (queryParam) params.query = queryParam;
        if (tagParam) params.tag = tagParam;

        const response = await api.get('/api/posts', { params });
        setPosts(response.data.content || []);
        setTotalPages(response.data.totalPages || 0);
        setPage(0);

        // Extract top 3 viewed posts as featured posts on first load
        if (!selectedCategory && !queryParam && !tagParam) {
          const sortedByViews = [...(response.data.content || [])]
            .sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))
            .slice(0, 3);
          setFeaturedPosts(sortedByViews);
        }
      } catch (err) {
        console.error('Error fetching posts:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPosts();
  }, [selectedCategory, queryParam, tagParam]);

  const loadMorePosts = async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const params = {
        page: nextPage,
        size: PAGE_SIZE,
        status: 'PUBLISHED',
        sortBy: 'publishedAt',
        direction: 'desc'
      };
      if (selectedCategory) params.categoryId = selectedCategory;
      if (queryParam) params.query = queryParam;
      if (tagParam) params.tag = tagParam;

      const response = await api.get('/api/posts', { params });
      setPosts((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        return [...prev, ...(response.data.content || []).filter((p) => !seen.has(p.id))];
      });
      setTotalPages(response.data.totalPages || 0);
      setPage(nextPage);
    } catch (err) {
      console.error('Error loading more posts:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  const tagList = [...new Set(posts.flatMap((p) => (p.tags || []).map((t) => t.name)))];

  // Fetch matching users when a search query is present
  useEffect(() => {
    const trimmed = queryParam.trim();
    if (!trimmed || trimmed.length < 3 || !user) {
      setUserResults([]);
      setUsersLoading(false);
      return;
    }
    let cancelled = false;
    const fetchUsers = async () => {
      setUsersLoading(true);
      try {
        const response = await api.get('/api/users/search', { params: { username: trimmed } });
        if (!cancelled) setUserResults(response.data || []);
      } catch (err) {
        if (!cancelled) setUserResults([]);
      } finally {
        if (!cancelled) setUsersLoading(false);
      }
    };
    fetchUsers();
    return () => { cancelled = true; };
  }, [queryParam, user]);

  // Reset page when category, query, or tag changes
  useEffect(() => {
    setPage(0);
  }, [selectedCategory, queryParam, tagParam]);

  // Automatic slide rotation for Carousel
  useEffect(() => {
    if (featuredPosts.length <= 1) return;
    const interval = setInterval(() => {
      setCarouselIndex((prev) => (prev + 1) % featuredPosts.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [featuredPosts]);

  const handleNextSlide = () => {
    setCarouselIndex((prev) => (prev + 1) % featuredPosts.length);
  };

  const handlePrevSlide = () => {
    setCarouselIndex((prev) => (prev - 1 + featuredPosts.length) % featuredPosts.length);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Draft';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getPlaceholderImage = (id) => {
    return `https://picsum.photos/800/450?random=${id || 1}`;
  };

  return (
    <div className="container home-container">
      <div className="home-layout home-layout-3col">
        {/* Left Sidebar */}
        <aside className="home-sidebar home-sidebar-left">
          <TrendingNow posts={trendingPosts} loading={widgetsLoading} />
          <RecentAuthors
            authors={authors}
            loading={widgetsLoading}
            highlightAuthorId={authorHighlightId}
            onSelectAuthor={handleAuthorSelect}
          />
        </aside>

        {/* Center Column */}
        <main className="home-main">
          {/* Hero Welcome Section */}
          <section className="hero">
        <div className="hero-glow" />
        <h1 className="hero-title animate-fade-in">
          Discover stories, thinking, and <span className="gradient-text">expertise</span>.
        </h1>
        <p className="hero-subtitle animate-fade-in" style={{ animationDelay: '0.1s' }}>
          Explore the best web development guides, design trends, and tech insights written by developers for developers.
        </p>
        {!user && (
          <button 
            className="hero-cta animate-fade-in" 
            style={{ animationDelay: '0.2s', border: 'none', cursor: 'pointer' }}
            onClick={() => navigate('/register')}
          >
            Start Your Journey
          </button>
        )}
      </section>

      {/* Reader Welcome Panel */}
      {user && isReader && (
        <div 
          className="glass-card" 
          style={{ 
            padding: '24px 32px', 
            marginBottom: '30px', 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            gap: '20px',
            flexWrap: 'wrap'
          }}
        >
          <div>
            <h3 style={{ fontSize: '1.3rem', fontWeight: '700', margin: 0 }}>
              Welcome back, <span className="gradient-text">{user.fullName || user.username}</span>!
            </h3>
            <p style={{ color: 'var(--text-secondary)', margin: '8px 0 0', fontSize: '0.9rem' }}>
              Browse the latest stories, leave comments, and discover new authors. Happy reading!
            </p>
          </div>
          <button 
            className="btn-submit" 
            style={{ width: 'auto', marginTop: 0 }}
            onClick={() => navigate('/profile')}
          >
            Edit Profile
          </button>
        </div>
      )}

      {/* Featured Articles Slider */}
      {featuredPosts.length > 0 && !selectedCategory && !queryParam && !tagParam && (
        <section className="featured-section">
          <h2 className="section-title">
            <FaFire color="var(--accent-secondary)" /> Featured Stories
          </h2>
          <div className="carousel glass-card">
            <div 
              className="carousel-slide" 
              style={{ backgroundImage: `url(${featuredPosts[carouselIndex].featuredImage || getPlaceholderImage(featuredPosts[carouselIndex].id)})` }}
            >
              <div className="carousel-content">
                <div className="carousel-meta">
                  <span>{featuredPosts[carouselIndex].category?.name}</span>
                  <span>&bull;</span>
                  <span><FaRegCalendarAlt /> {formatDate(featuredPosts[carouselIndex].publishedAt)}</span>
                </div>
                <h3 
                  className="carousel-title"
                  onClick={() => navigate(`/post/${featuredPosts[carouselIndex].id}`)}
                >
                  {featuredPosts[carouselIndex].title}
                </h3>
                <p className="carousel-summary">{featuredPosts[carouselIndex].summary}</p>
              </div>
            </div>
            
            {featuredPosts.length > 1 && (
              <>
                <button className="carousel-btn prev" onClick={handlePrevSlide}><FaChevronLeft /></button>
                <button className="carousel-btn next" onClick={handleNextSlide}><FaChevronRight /></button>
              </>
            )}
          </div>
        </section>
      )}

      {/* User Search Results (only for searches) */}
      {queryParam && (
        <section className="users-section">
          <h2 className="section-title">Users</h2>
          {usersLoading ? (
            <div className="glass-card users-strip" style={{ padding: '20px', color: 'var(--text-secondary)' }}>
              Searching users...
            </div>
          ) : userResults.length === 0 ? (
            <div className="glass-card users-strip" style={{ padding: '20px', color: 'var(--text-secondary)' }}>
              No users found
            </div>
          ) : (
            <div className="users-strip">
              {userResults.map((u) => (
                <div key={u.id} className="user-result-card glass-card" onClick={() => navigate(`/profile/user/${u.id}`)}>
                  {u.profileImage ? (
                    <img src={u.profileImage} alt={u.username} className="user-result-image" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                  ) : (
                    <span className="user-result-image user-result-image-fallback"><FaUser size={18} /></span>
                  )}
                  <span className="user-result-username">{u.username}</span>
                  <span className="user-result-fullname">{u.fullName}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

          {/* Latest Stories Feed */}
          <section id="latest-stories">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
            <h2 className="section-title" style={{ margin: 0, fontSize: '1.75rem', fontWeight: '800' }}>
              {queryParam ? `Search Results for "${queryParam}"` : tagParam ? `Stories tagged "#${tagParam}"` : selectedCategory ? 'Filtered Stories' : 'Latest Stories'}
            </h2>
            
            <div className="category-filter-dropdown" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Topic:</span>
              <select
                value={selectedCategory || ''}
                onChange={(e) => setSelectedCategory(e.target.value ? parseInt(e.target.value, 10) : null)}
                className="form-input"
                style={{ 
                  width: '180px', 
                  height: '38px', 
                  borderRadius: '8px', 
                  backgroundColor: 'var(--bg-secondary)', 
                  border: '1px solid var(--border-color)', 
                  color: 'var(--text-primary)',
                  padding: '0 10px',
                  cursor: 'pointer'
                }}
              >
                <option value="">All Topics</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            {tagParam && (
              <button
                className="pagination-btn"
                onClick={() => setSearchParams({})}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
              >
                <FaHashtag /> {tagParam} &times; Clear tag
              </button>
            )}
          </div>

          {tagList.length > 0 && !queryParam && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600' }}>
                <FaTags /> Tags:
              </span>
              {tagList.slice(0, 12).map((tagName) => (
                <button
                  key={tagName}
                  className={`post-tag ${tagParam === tagName ? 'active' : ''}`}
                  style={{ cursor: 'pointer', border: 'none', background: tagParam === tagName ? 'rgba(108, 99, 255, 0.25)' : 'rgba(255,255,255,0.06)' }}
                  onClick={() => {
                    if (tagParam === tagName) {
                      setSearchParams(queryParam ? { query: queryParam } : {});
                    } else {
                      setSearchParams({ tag: tagName });
                    }
                  }}
                >
                  #{tagName}
                </button>
              ))}
            </div>
          )}

          {authorHighlightId && (
            <div className="author-highlight-banner" onClick={() => setAuthorHighlightId(null)}>
              <FaUser size={13} />
              Latest posts by{' '}
              <strong>@{authors.find((a) => a.id === authorHighlightId)?.username || 'this author'}</strong>{' '}
              highlighted below
              <span className="author-highlight-clear">&times; Clear</span>
            </div>
          )}

          {loading ? (
            <div style={{ textAlign: 'center', padding: '50px 0', color: 'var(--text-secondary)' }}>
              Loading awesome posts...
            </div>
          ) : posts.length === 0 ? (
            <div className="glass-card" style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <h3>No articles found</h3>
              <p style={{ marginTop: '10px' }}>Try exploring other categories or clearing your search filter.</p>
              {(selectedCategory || queryParam || tagParam) && (
                <button
                  className="btn-submit"
                  style={{ width: 'auto', marginTop: '20px', padding: '10px 20px' }}
                  onClick={() => { setSelectedCategory(null); setSearchParams({}); }}
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="posts-grid">
                {posts.map((post) => (
                  <article
                    key={post.id}
                    className={`post-card glass-card ${authorHighlightId && post.authorId === authorHighlightId ? 'author-highlighted' : ''}`}
                    style={authorHighlightId && post.authorId === authorHighlightId ? { boxShadow: '0 0 0 2px rgba(99, 102, 241, 0.55)' } : undefined}
                  >
                    <div 
                      className="post-card-image"
                      style={{ backgroundImage: `url(${post.featuredImage || getPlaceholderImage(post.id)})`, cursor: 'pointer' }}
                      onClick={() => navigate(`/post/${post.id}`)}
                    >
                      <span className="post-card-category">{post.category?.name}</span>
                    </div>
                    <div className="post-card-body">
                      <div className="post-card-meta">
                        <span>{formatDate(post.publishedAt)}</span>
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

              {/* Load More Button */}
              {page + 1 < totalPages && (
                <div className="pagination" style={{ justifyContent: 'center' }}>
                  <button
                    className="pagination-btn"
                    disabled={loadingMore}
                    onClick={loadMorePosts}
                    style={{ padding: '10px 28px' }}
                  >
                    {loadingMore ? 'Loading more...' : 'Load More Stories'}
                  </button>
                </div>
              )}
            </>
          )}
          </section>
        </main>

        {/* Right Sidebar */}
        <aside className="home-sidebar home-sidebar-right">
          <div className="sidebar-widget glass-card">
            <h3 className="footer-links-title" style={{ color: 'var(--text-primary)', marginBottom: '20px' }}>
              <FaTags /> Explore Topics
            </h3>
            <ul className="category-list">
              <li 
                className={`category-item ${selectedCategory === null ? 'active' : ''}`}
                onClick={() => setSelectedCategory(null)}
              >
                <span>All Topics</span>
                <span>{categories.reduce((acc, cat) => acc + (cat.postCount || 0), 0) || ''}</span>
              </li>
              {categories.map((cat) => (
                <li
                  key={cat.id}
                  className={`category-item ${selectedCategory === cat.id ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(cat.id)}
                >
                  <span>{cat.name}</span>
                  <span>{cat.description ? '' : ''}</span>
                </li>
              ))}
            </ul>
          </div>
          <TopContributors contributors={contributors} loading={widgetsLoading} />
          <RecentComments comments={comments} loading={widgetsLoading} />
        </aside>
      </div>
    </div>
  );
};

export default Home;
