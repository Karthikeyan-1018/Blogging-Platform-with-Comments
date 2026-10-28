import React from 'react';
import { FaBell } from 'react-icons/fa';

export const NotificationsPanel = ({ notifications, onMarkRead, onMarkAllRead }) => (
  <div style={{ display: 'flex', flexDirection: 'column', marginTop: '20px' }}>
    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
      <button
        className="pagination-btn"
        onClick={onMarkAllRead}
        disabled={notifications.every((n) => n.read)}
      >
        Mark all as read
      </button>
    </div>
    {notifications.length === 0 ? (
      <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '30px 0' }}>
        No notifications yet.
      </p>
    ) : (
      notifications.map((notif) => (
        <div
          key={notif.id}
          className={`notification-item ${notif.read ? '' : 'unread'}`}
          onClick={() => onMarkRead(notif)}
          style={{ cursor: 'pointer' }}
        >
          <div>
            {notif.title && <div className="notification-title">{notif.title}</div>}
            <div className="notification-msg" style={{ fontWeight: notif.read ? 'normal' : '600' }}>
              {notif.message}
            </div>
            <div className="notification-time">{notif.time}</div>
          </div>
          {!notif.read && <FaBell size={10} color="var(--accent-primary)" style={{ marginTop: '5px' }} />}
        </div>
      ))
    )}
  </div>
);