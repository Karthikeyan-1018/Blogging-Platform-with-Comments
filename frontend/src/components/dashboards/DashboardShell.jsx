import React from 'react';
import { RoleHeader } from './common';

const DashboardShell = ({ user, metrics, tabs, active, onSelect, unreadCount, children, extraActions }) => (
  <div className="container dashboard-container animate-fade-in">
    <RoleHeader user={user} />

    <section className="metrics-grid">{metrics}</section>

    <div className="editor-card glass-card dashboard-content-box">
      <div className="editor-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`editor-tab ${active === tab.id ? 'active' : ''}`}
            onClick={() => onSelect(tab.id)}
          >
            {tab.id === 'notifications' ? `Notifications (${unreadCount})` : tab.label}
          </button>
        ))}
        {extraActions}
      </div>
      {children}
    </div>
  </div>
);

export default DashboardShell;