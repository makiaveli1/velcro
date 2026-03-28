import React, { useState, createContext, useContext, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import Dashboard from './pages/Dashboard';
import Discovery from './pages/Discovery';
import Contacts from './pages/Contacts';
import ContactDossier from './pages/ContactDossier';
import FollowUps from './pages/FollowUps';
import Drafts from './pages/Drafts';
import Settings from './pages/Settings';
import OutboundQueue from './pages/OutboundQueue';

// ── Toast Context ─────────────────────────────────────────
export const ToastContext = createContext(null);

let toastId = 0;
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback(({ type = 'info', message, duration = 4000 }) => {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, type, message }]);
    if (duration > 0) {
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
    }
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
    </ToastContext.Provider>
  );
}

// ── App ───────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<ErrorBoundary><Dashboard /></ErrorBoundary>} />
            <Route path="discovery" element={<ErrorBoundary><Discovery /></ErrorBoundary>} />
            <Route path="contacts" element={<ErrorBoundary><Contacts /></ErrorBoundary>} />
            <Route path="contacts/:id" element={<ErrorBoundary><ContactDossier /></ErrorBoundary>} />
            <Route path="followups" element={<ErrorBoundary><FollowUps /></ErrorBoundary>} />
            <Route path="drafts" element={<ErrorBoundary><Drafts /></ErrorBoundary>} />
            <Route path="outbound" element={<ErrorBoundary><OutboundQueue /></ErrorBoundary>} />
            <Route path="settings" element={<ErrorBoundary><Settings /></ErrorBoundary>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </ToastProvider>
    </BrowserRouter>
  );
}
