import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/api';
import { FaSearch, FaSignOutAlt, FaBars, FaTimes, FaPenNib, FaUser, FaBell } from 'react-icons/fa';
import '../styles/Header.css';

const MIN_SEARCH_LENGTH = 3;
const SEARCH_DEBOUNCE_MS = 400;

const Header = () => {
  const { user, logout, isReader, isModerator } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [userResults, setUserResults] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearchError, setUserSearchError] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const navigate = useNavigate();
  const searchRequestId = useRef(0);
  const searchBoxRef = useRef(null);
  const notifBoxRef = useRef(null);

  useEffect(() => {
    const refresh = async () => {
      if (!user) return;
      try {
        const res = await api.get('/api/notifications/unread-count');
        setUnreadCount(res.data?.unreadCount || 0);
      } catch (e) {
        console.warn('Could not load unread count', e);
      }
    };
    refresh();
    const interval = setInterval(refresh, 60000);
    return () => clearInterval(interval);
  }, [user]);

  // Fetch maintenance banner status (non-admin users see it)
  useEffect(() => {
    const fetchMaintenance = async () => {
      if (!user) return;
      try {
        const res = await api.get('/api/settings');
        setMaintenanceMode(res.data?.maintenanceMode === true);
      } catch (e) {
        console.warn('Could not load settings', e);
      }
    };
    fetchMaintenance();
  }, [user]);

  const toggleNotifications = async () => {
    setShowNotifDropdown((prev) => {
      const willShow = !prev;
      if (willShow && user) {
        api.get('/api/notifications', { params: { page: 0, size: 8 } })
          .then((res) => setNotifications(res.data?.content || []))
          .catch(console.warn);
      }
      return willShow;
    });
  };

  const handleNotificationClick = async (notification) => {
    if (!notification.read) {
      try {
        await api.put(`/api/notifications/${notification.id}/read`);
        setNotifications((prev) => prev.map((n) => n.id === notification.id ? { ...n, read: true } : n));
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch (e) {
        console.warn('Failed to mark notification read', e);
      }
    }
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifBoxRef.current && !notifBoxRef.current.contains(e.target)) {
        setShowNotifDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Live user search (debounced) — post/story search stays on submit
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (trimmed.length < MIN_SEARCH_LENGTH || !user) {
      setShowUserDropdown(false);
      setUserResults([]);
      setUsersLoading(false);
      setUserSearchError(false);
      return;
    }

    setUsersLoading(true);
    setShowUserDropdown(true);
    const requestId = ++searchRequestId.current;

    const timer = setTimeout(async () => {
      try {
        const response = await api.get('/api/users/search', { params: { username: trimmed } });
        if (requestId !== searchRequestId.current) return; // stale response
        const others = (response.data || []).filter((u) => u.id !== user.id);
        setUserResults(others);
        setUserSearchError(false);
      } catch (err) {
        if (requestId !== searchRequestId.current) return;
        setUserResults([]);
        setUserSearchError(true);
      } finally {
        if (requestId === searchRequestId.current) {
          setUsersLoading(false);
        }
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [searchQuery, user]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target)) {
        setShowUserDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setShowUserDropdown(false);
    if (searchQuery.trim()) {
      navigate(`/?query=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate('/');
    }
  };

  const handleUserClick = (userId) => {
    setShowUserDropdown(false);
    setSearchQuery('');
    navigate(`/profile/user/${userId}`);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  return (
    <header className="header">
      {maintenanceMode && user?.role?.toUpperCase() !== 'ADMIN' && (
        <div className="maintenance-banner">
          The platform is currently under maintenance. Some features may be temporarily unavailable.
        </div>
      )}
      <div className="container header-container">
        {/* Brand Logo */}
        <div className="logo" onClick={() => { navigate('/'); closeMobileMenu(); }}>
          <div className="logo-icon">
            <FaPenNib size={16} />
          </div>
          <span className="gradient-text">BlogHub</span>
        </div>

        {/* Global Search Bar (stories + users) */}
        <form className="search-bar" onSubmit={handleSearchSubmit} ref={searchBoxRef} style={{ position: 'relative' }}>
          <FaSearch color="var(--text-secondary)" size={14} />
          <input
            type="text"
            className="search-input"
            placeholder="Search stories or users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => { if (userResults.length > 0 || usersLoading) setShowUserDropdown(true); }}
            onKeyDown={(e) => { if (e.key === 'Escape') setShowUserDropdown(false); }}
          />
          {showUserDropdown && user && (
            <div className="user-search-dropdown">
              <div className="user-dropdown-label">USERS</div>
              {usersLoading ? (
                <div className="user-dropdown-state">Searching users...</div>
              ) : userSearchError ? (
                <div className="user-dropdown-state error">Couldn't load users. Try again.</div>
              ) : userResults.length === 0 ? (
                <div className="user-dropdown-state">No users found</div>
              ) : (
                userResults.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    className="user-result-item"
                    onClick={() => handleUserClick(u.id)}
                  >
                    {u.profileImage ? (
                      <img src={u.profileImage} alt={u.username} className="user-result-avatar" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                    ) : (
                      <span className="user-result-avatar user-result-avatar-fallback"><FaUser size={11} /></span>
                    )}
                    <span className="user-result-info">
                      <span className="user-result-username">{u.username}</span>
                      <span className="user-result-fullname">{u.fullName}</span>
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </form>

        {/* Navigation Link List */}
        <nav>
          <ul className={`nav-links ${mobileMenuOpen ? 'open' : ''}`}>
            <li>
              <NavLink to="/" className="nav-link" onClick={closeMobileMenu}>
                Home
              </NavLink>
            </li>
            {user && (
              <>
                <li>
                  <NavLink to="/dashboard" className="nav-link" onClick={closeMobileMenu}>
                    Dashboard
                  </NavLink>
                </li>
                {!isReader && !isModerator && (
                  <li>
                    <NavLink to="/create" className="nav-link" onClick={closeMobileMenu}>
                      Create Post
                    </NavLink>
                  </li>
                )}
                <li>
                  <NavLink to="/profile" className="nav-link" onClick={closeMobileMenu}>
                    Profile
                  </NavLink>
                </li>
              </>
            )}
          </ul>
        </nav>

        {/* User Account Controls */}
        <div className="header-actions">
          {user ? (
            <>
              <div className="notif-bell-wrapper" ref={notifBoxRef} style={{ position: 'relative' }}>
                <button className="notif-bell" onClick={toggleNotifications} title="Notifications">
                  <FaBell size={16} />
                  {unreadCount > 0 && <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
                </button>
                {showNotifDropdown && (
                  <div className="notif-dropdown">
                    <div className="notif-dropdown-header">
                      <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>Notifications</span>
                      <button
                        className="notif-view-all"
                        onClick={() => { setShowNotifDropdown(false); navigate('/dashboard'); }}
                      >
                        View all
                      </button>
                    </div>
                    {notifications.length === 0 ? (
                      <div className="notif-dropdown-empty">No notifications yet</div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          className={`notif-item ${n.read ? '' : 'unread'}`}
                          onClick={() => handleNotificationClick(n)}
                        >
                          <div className="notif-msg">{n.message}</div>
                          <div className="notif-time">{new Date(n.createdAt).toLocaleString()}</div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
              <div className="user-badge" onClick={() => navigate('/profile')} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {user.profileImage ? (
                  <img 
                    src={user.profileImage} 
                    alt="user-avatar" 
                    onError={(e) => { e.currentTarget.style.display = 'none'; }} 
                    style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--accent-secondary)' }} 
                  />
                ) : (
                  <FaUser size={12} color="var(--accent-primary)" />
                )}
                <span className="username">{user.username}</span>
                <span className="role-tag">{user.role}</span>
              </div>
              <button className="btn-logout" onClick={handleLogout} title="Logout">
                <FaSignOutAlt />
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login" className="btn-login">Login</NavLink>
              <NavLink to="/register" className="btn-register">Register</NavLink>
            </>
          )}
          <button className="hamburger" onClick={toggleMobileMenu}>
            {mobileMenuOpen ? <FaTimes /> : <FaBars />}
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
