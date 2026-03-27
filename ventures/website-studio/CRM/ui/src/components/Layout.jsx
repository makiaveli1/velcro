import React, { useState, useEffect, useRef } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import NLQueryBar from './NLQueryBar';
import Toast from './Toast';
import { useToast } from '../App';
import { apiDiscoveryStats, apiFollowUps } from '../api';

export default function Layout() {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app-shell">
      <Sidebar
        currentPath={location.pathname}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="app-main">
        <div className="app-topbar" style={{ padding: '12px 24px' }}>
          <NLQueryBar />
        </div>
        <div className="app-content">
          <Outlet />
        </div>
      </div>
      <ToastContainer />
    </div>
  );
}

function ToastContainer() {
  const { toasts, removeToast } = useToast();
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <Toast key={t.id} type={t.type} message={t.message} onClose={() => removeToast(t.id)} />
      ))}
    </div>
  );
}
