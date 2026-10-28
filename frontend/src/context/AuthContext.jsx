import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../api/api';
import { useAlert } from './AlertContext';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const { showAlert } = useAlert();
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  // Setup automatic logout timers
  useEffect(() => {
    let logoutTimer;
    
    if (user && token) {
      // Calculate token lifetime based on roles
      let lifetimeMs = 4 * 60 * 60 * 1000; // Default 4 hours for READER
      const role = user.role?.toUpperCase();
      
      if (role === 'BLOGGER' || role === 'PREMIUM_BLOGGER') {
        lifetimeMs = 8 * 60 * 60 * 1000;
      } else if (role === 'MODERATOR' || role === 'ADMIN') {
        lifetimeMs = 12 * 60 * 60 * 1000;
      }

      // Check login timestamp
      const loginTime = localStorage.getItem('loginTimestamp');
      const timeElapsed = loginTime ? Date.now() - parseInt(loginTime, 10) : 0;
      const remainingTime = lifetimeMs - timeElapsed;

      if (remainingTime <= 0) {
        logout();
      } else {
        logoutTimer = setTimeout(() => {
          logout();
          showAlert('Your session has expired. Please log in again.', 'warning');
        }, remainingTime);
      }
    }

    return () => {
      if (logoutTimer) clearTimeout(logoutTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, token]);

  // Setup listener for interceptor logouts and restore fresh user details on application reload
  useEffect(() => {
    const handleInterceptorLogout = () => {
      setUser(null);
      setToken(null);
    };

    window.addEventListener('auth-logout', handleInterceptorLogout);

    const restoreSession = async () => {
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        try {
          setToken(storedToken);
          // Set authorization header temporarily for this bootstrap call
          api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
          const response = await api.get('/api/users/profile');
          const profile = response.data;
          const freshUser = {
            username: profile.username,
            role: profile.role?.roleName,
            fullName: profile.fullName,
            profileImage: profile.profileImage
          };
          localStorage.setItem('user', JSON.stringify(freshUser));
          setUser(freshUser);
        } catch (e) {
          console.warn('Could not load fresh profile on boot', e);
          if (e.response && (e.response.status === 401 || e.response.status === 403)) {
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');
            setUser(null);
            setToken(null);
          } else {
            const savedUser = localStorage.getItem('user');
            if (savedUser) {
              setUser(JSON.parse(savedUser));
            }
          }
        }
      }
      setLoading(false);
    };

    restoreSession();

    return () => {
      window.removeEventListener('auth-logout', handleInterceptorLogout);
    };
  }, []);

  const login = async (username, password) => {
    try {
      const response = await api.post('/api/auth/login', { username, password });
      const { token, refreshToken, role, profileImage, fullName } = response.data;
      
      const userData = { username, role, profileImage, fullName };
      
      localStorage.setItem('token', token);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('loginTimestamp', Date.now().toString());

      setToken(token);
      setUser(userData);
      return userData;
    } catch (error) {
      throw error.response?.data?.message || 'Login failed';
    }
  };

  const register = async (userData) => {
    try {
      await api.post('/api/auth/register', userData);
    } catch (error) {
      throw error.response?.data?.message || 'Registration failed';
    }
  };

  const logout = async () => {
    try {
      if (token) {
        await api.post('/api/auth/logout', {}, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
      }
    } catch (e) {
      console.warn('Logout request failed', e);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      localStorage.removeItem('loginTimestamp');
      setToken(null);
      setUser(null);
    }
  };

  const updateUserLocal = (newUserData) => {
    setUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...newUserData };
      localStorage.setItem('user', JSON.stringify(updated));
      return updated;
    });
  };

  const getRoleLevel = () => {
    if (!user) return null;
    return user.role?.toUpperCase();
  };

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    updateUserLocal,
    getRoleLevel,
    isReader: getRoleLevel() === 'READER',
    isBlogger: getRoleLevel() === 'BLOGGER',
    isPremiumBlogger: getRoleLevel() === 'PREMIUM_BLOGGER',
    isModerator: getRoleLevel() === 'MODERATOR',
    isAdmin: getRoleLevel() === 'ADMIN'
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
