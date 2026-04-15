import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { apiDiscoveryStats, apiFollowUps } from '../api';

const DashboardIcon = () => (
  <svg className="sidebar-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
);

const DiscoveryIcon = () => (
  <svg className="sidebar-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
  </svg>
);

const ContactsIcon = () => (
  <svg className="sidebar-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const FollowUpsIcon = () => (
  <svg className="sidebar-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const DraftsIcon = () => (
  <svg className="sidebar-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const OutboundIcon = () => (
  <svg className="sidebar-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

const PipelineIcon = () => (
  <svg className="sidebar-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
);

const SettingsIcon = () => (
  <svg className="sidebar-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const LogoMark = () => (
  <svg className="sidebar-logo-icon" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2 L22 12 L12 22 L2 12 Z" />
  </svg>
);

export default function Sidebar({ currentPath, open, onClose }) {
  const navigate = useNavigate();
  const [discoveryCount, setDiscoveryCount] = useState(null);
  const [followUpCount, setFollowUpCount] = useState(null);

  useEffect(() => {
    apiDiscoveryStats().then(d => {
      if (d) setDiscoveryCount(d.pending);
    }).catch(() => {});
    apiFollowUps({ status: 'pending' }).then(d => {
      if (d?.followUps) setFollowUpCount(d.followUps.length);
    }).catch(() => {});
  }, []);

  const nav = [
    { path: '/', label: 'Dashboard', icon: <DashboardIcon />, exact: true },
    { path: '/discovery', label: 'Discovery', icon: <DiscoveryIcon />, badge: discoveryCount },
    { path: '/contacts', label: 'Contacts', icon: <ContactsIcon /> },
    { path: '/followups', label: 'Follow-ups', icon: <FollowUpsIcon />, badge: followUpCount, badgeAlert: true },
    { path: '/drafts', label: 'Drafts', icon: <DraftsIcon /> },
    { path: '/outbound', label: 'Outbound', icon: <OutboundIcon /> },
    { path: '/pipeline', label: 'Pipeline', icon: <PipelineIcon /> },
    { path: '/settings', label: 'Settings', icon: <SettingsIcon /> },
  ];

  const isActive = (item) => {
    if (item.exact) return currentPath === item.path;
    return currentPath.startsWith(item.path);
  };

  return (
    <>
      {open && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99 }}
          onClick={onClose}
        />
      )}
      <aside className="app-sidebar" style={{ transform: open ? 'translateX(0)' : undefined }}>
        <div className="sidebar-logo">
          <div className="sidebar-logo-mark">
            <LogoMark />
            <div>
              <div className="sidebar-logo-text">Verdantia</div>
              <div className="sidebar-logo-sub">CRM 2.0</div>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-section">
            <div className="sidebar-section-label">Workspace</div>
            {nav.slice(0, 6).map(item => (
              <NavLink
                key={item.path}
                to={item.path}
                className={`sidebar-item ${isActive(item) ? 'active' : ''}`}
                onClick={onClose}
              >
                {item.icon}
                {item.label}
                {item.badge != null && item.badge > 0 && (
                  <span className={`sidebar-item-badge ${item.badgeAlert ? 'alert' : ''}`}>
                    {item.badge}
                  </span>
                )}
              </NavLink>
            ))}
          </div>
        </nav>

        <div className="sidebar-bottom">
          <NavLink
            to="/settings"
            className={`sidebar-item ${isActive({ path: '/settings' }) ? 'active' : ''}`}
            onClick={onClose}
          >
            <SettingsIcon />
            Settings
          </NavLink>
        </div>
      </aside>
    </>
  );
}
