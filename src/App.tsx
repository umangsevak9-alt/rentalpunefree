/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAppStore } from './store/index.js';
import { supabase, supabaseService } from './services/supabaseService.js';

// Layouts
import PublicLayout from './components/layout/PublicLayout.js';
import AdminLayout from './components/layout/AdminLayout.js';
import ScrollToTop from './components/common/ScrollToTop.js';

// Public
import Home from './pages/public/Home.js';
import ListProperty from './pages/public/ListProperty.js';
import ThankYou from './pages/public/ThankYou.js';
import Login from './pages/auth/Login.js';

// Admin
import Dashboard from './pages/admin/Dashboard.js';
import Properties from './pages/admin/Properties.js';
import OwnerSubmissions from './pages/admin/OwnerSubmissions.js';
import Leads from './pages/admin/Leads.js';
import Bookings from './pages/admin/Bookings.js';
import Settings from './pages/admin/Settings.js';
import HeroSection from './pages/admin/HeroSection.js';
import Visits from './pages/admin/Visits.js';
import Agents from './pages/admin/Agents.js';
import Feedback from './pages/admin/Feedback.js';
import Invoices from './pages/admin/Invoices.js';
import Faqs from './pages/admin/Faqs.js';
import Gallery from './pages/admin/Gallery.js';

/**
 * Route protection wrapper based directly on verified Supabase Auth Session
 */
function ProtectedRoute({ children, requireAdmin = false }: { children: React.ReactNode, requireAdmin?: boolean }) {
  const { user, session, isAuthLoading } = useAppStore();
  const location = useLocation();

  // If initial Supabase session verification is in-flight, show clean loading state
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-[#080f1a] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#d4a359] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-[#d4a359] font-medium tracking-wide">Verifying Supabase Session...</p>
        </div>
      </div>
    );
  }

  // Not authenticated via Supabase session
  if (!session || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Role permissions check
  if (requireAdmin && user?.role === 'AGENT') {
    return <Navigate to="/admin/visits" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  const { setAuth, logout, setSettings } = useAppStore();

  useEffect(() => {
    // 1. Fetch public settings & preload data from Supabase
    supabaseService.settings.get()
      .then(data => setSettings(data))
      .catch(console.error);

    // 2. Initialize Realtime Subscriptions for live updates across all clients
    const unsubscribeRealtime = supabaseService.realtime.init();

    const handleSettingsSynced = (e: any) => {
      if (e.detail) {
        setSettings(e.detail);
      }
    };
    window.addEventListener('rp_settings_synced', handleSettingsSynced);

    let isSubscribed = true;

    // 3. On application/page load: verify existing session via getSession()
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      if (!isSubscribed) return;
      if (error || !session?.user) {
        logout();
      } else {
        try {
          const profile = await supabaseService.auth.fetchUserProfile(session.user);
          if (isSubscribed) {
            setAuth(profile, session.access_token, session);
          }
        } catch (err) {
          console.error('Session user profile load failed:', err);
          if (isSubscribed) logout();
        }
      }
    }).catch((err) => {
      console.error('getSession error:', err);
      if (isSubscribed) logout();
    });

    // 4. Reliable auth state listener using onAuthStateChange
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isSubscribed) return;

      if (event === 'SIGNED_OUT' || !session?.user) {
        logout();
      } else if (session?.user) {
        try {
          const profile = await supabaseService.auth.fetchUserProfile(session.user);
          if (isSubscribed) {
            setAuth(profile, session.access_token, session);
          }
        } catch (err) {
          console.error('onAuthStateChange profile error:', err);
        }
      }
    });

    return () => {
      isSubscribed = false;
      subscription.unsubscribe();
      window.removeEventListener('rp_settings_synced', handleSettingsSynced);
      unsubscribeRealtime();
    };
  }, [setAuth, logout, setSettings]);

  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<PublicLayout />}>
          <Route index element={<Home />} />
          <Route path="list-property" element={<ListProperty />} />
          <Route path="thank-you" element={<ThankYou />} />
        </Route>
        
        {/* Authentication Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/admin/login" element={<Navigate to="/login" replace />} />
        
        {/* Protected Admin Routes */}
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
          <Route path="gallery" element={<ProtectedRoute requireAdmin><Gallery /></ProtectedRoute>} />
          <Route path="bookings" element={<Bookings />} />
          <Route path="leads" element={<ProtectedRoute requireAdmin><Leads /></ProtectedRoute>} />
          <Route path="settings" element={<ProtectedRoute requireAdmin><Settings /></ProtectedRoute>} />
          <Route path="agents" element={<ProtectedRoute requireAdmin><Agents /></ProtectedRoute>} />
          <Route path="invoices" element={<ProtectedRoute requireAdmin><Invoices /></ProtectedRoute>} />
          <Route path="visits" element={<Visits />} />
          <Route path="feedback" element={<Feedback />} />
        </Route>

        {/* Catch-all fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
