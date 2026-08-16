/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAppStore } from './store/index.js';

// Layouts
import PublicLayout from './components/layout/PublicLayout.js';
import AdminLayout from './components/layout/AdminLayout.js';

// Public
import Home from './pages/public/Home.js';
import ListProperty from './pages/public/ListProperty.js';
import Login from './pages/auth/Login.js';

// Admin
import Dashboard from './pages/admin/Dashboard.js';
import Properties from './pages/admin/Properties.js';
import OwnerSubmissions from './pages/admin/OwnerSubmissions.js';
import Leads from './pages/admin/Leads.js';
import Settings from './pages/admin/Settings.js';
import HeroSection from './pages/admin/HeroSection.js';
import Visits from './pages/admin/Visits.js';
import Agents from './pages/admin/Agents.js';
import Feedback from './pages/admin/Feedback.js';
import Invoices from './pages/admin/Invoices.js';
import Faqs from './pages/admin/Faqs.js';

function ProtectedRoute({ children, requireAdmin = false }: { children: React.ReactNode, requireAdmin?: boolean }) {
  const { user, token } = useAppStore();
  
  if (!token) return <Navigate to="/login" replace />;
  
  if (requireAdmin && user?.role === 'AGENT') {
    return <Navigate to="/admin/visits" replace />;
  }
  
  return children;
}

export default function App() {
  const { token, setAuth, setSettings } = useAppStore();

  useEffect(() => {
    // Load Settings
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => setSettings(data))
      .catch(console.error);
      
    // Verify token
    if (token) {
      fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => {
        if (!res.ok) throw new Error('Invalid token');
        return res.json();
      })
      .then(user => setAuth(user, token))
      .catch(() => setAuth(null, null));
    }
  }, [token, setAuth, setSettings]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PublicLayout />}>
          <Route index element={<Home />} />
          <Route path="list-property" element={<ListProperty />} />
        </Route>
        
        <Route path="/login" element={<Login />} />
        
        <Route path="/admin" element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }>
          <Route index element={<Dashboard />} />
          <Route path="hero" element={<ProtectedRoute requireAdmin><HeroSection /></ProtectedRoute>} />
          <Route path="properties" element={<ProtectedRoute requireAdmin><Properties /></ProtectedRoute>} />
          <Route path="owner-submissions" element={<ProtectedRoute requireAdmin><OwnerSubmissions /></ProtectedRoute>} />
          <Route path="faqs" element={<ProtectedRoute requireAdmin><Faqs /></ProtectedRoute>} />
          <Route path="leads" element={<ProtectedRoute requireAdmin><Leads /></ProtectedRoute>} />
          <Route path="settings" element={<ProtectedRoute requireAdmin><Settings /></ProtectedRoute>} />
          <Route path="agents" element={<ProtectedRoute requireAdmin><Agents /></ProtectedRoute>} />
          <Route path="invoices" element={<ProtectedRoute requireAdmin><Invoices /></ProtectedRoute>} />
          <Route path="visits" element={<Visits />} />
          <Route path="feedback" element={<Feedback />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
