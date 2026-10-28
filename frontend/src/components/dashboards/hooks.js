import { useState, useEffect, useCallback } from 'react';
import api from '../../api/api';
import { useAlert } from '../../context/AlertContext';
import { normalizeNotifications } from './common';

export const useNotifications = (size = 20) => {
  const { showAlert } = useAlert();
  const [notifications, setNotifications] = useState([]);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await api.get('/api/notifications', { params: { page: 0, size } });
      setNotifications(normalizeNotifications(res.data?.content));
    } catch (e) {
      console.warn('Failed to fetch notifications', e);
    }
  }, [size]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markRead = async (notification) => {
    if (notification.read) return;
    try {
      await api.put(`/api/notifications/${notification.id}/read`);
      setNotifications((prev) => prev.map((n) => n.id === notification.id ? { ...n, read: true } : n));
    } catch (e) {
      console.warn('Failed to mark notification as read', e);
    }
  };

  const markAllRead = async () => {
    try {
      await api.put('/api/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      showAlert('All notifications marked as read', 'success');
    } catch (e) {
      showAlert(e.response?.data?.message || 'Error marking notifications', 'error');
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return { notifications, unreadCount, markRead, markAllRead, fetchNotifications };
};