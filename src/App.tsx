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

// Public - Landing page loaded directly for 0ms initial render
import Home from './pages/public/Home.js';

// Lazy-loaded secondary and admin routes
const ListProperty = React.lazy(() => import('./pages/public/ListProperty.js'));
const ThankYou = React.lazy(() => import('./pages/public/ThankYou.js'));
const Login = React.lazy(() => import('./pages/auth/Login.js'));

// Admin lazy routes
const Dashboard = React.lazy(() => import('./pages/admin/Dashboard.js'));
const Properties = React.lazy(() => import('./pages/admin/Properties.js'));
const OwnerSubmissions = React.lazy(() => import('./pages/admin/OwnerSubmissions.js'));
const Leads = React.lazy(() => import('./pages/admin/Leads.js'));
const Bookings = React.lazy(() => import('./pages/admin/Bookings.js'));
const Settings = React.lazy(() => import('./pages/admin/Settings.js'));
const HeroSection = React.lazy(() => import('./pages/admin/HeroSection.js'));
const Visits = React.lazy(() => import('./pages/admin/Visits.js'));
const Agents = React.lazy(() => import('./pages/admin/Agents.js'));
const Feedback = React.lazy(() => import('./pages/admin/Feedback.js'));
const Invoices = React.lazy(() => import('./pages/admin/Invoices.js'));
const Faqs = React.lazy(() => import('./pages/admin/Faqs.js'));
const Gallery = React.lazy(() => import('./pages/admin/Gallery.js'));
const WhatsAppSettings = React.lazy(() => import('./pages/admin/WhatsAppSettings.js'));

function PageLoader() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center py-20">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-[#d4a359] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs text-[#d4a359] font-medium tracking-wide">Loading...</p>
      </div>
    </div>
  );
}

/**
 * Route protection wrapper based directly on verified Supabase Auth Session
 */
function ProtectedRoute({ children, requireAdmin = false }: { children: React.ReactNode, requireAdmin?: boolean }) {
  const { user, session, token, isAuthLoading } = useAppStore();
  const location = useLocation();

  // If initial Supabase session verification is in-flight, show clean loading state
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-[#080f1a] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#d4a359] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-[#d4a359] font-medium tracking-wide">Verifying Session...</p>
        </div>
      </div>
    );
  }

  // Not authenticated via session or verified token
  if (!user || (!session && !token)) {
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
        // Check for local stored token and user as fallback
        if (typeof window !== 'undefined' && window.localStorage) {
          const storedToken = localStorage.getItem('rp_auth_token');
          const storedUser = localStorage.getItem('rp_auth_user');
          if (storedToken && storedUser) {
            try {
              const parsedUser = JSON.parse(storedUser);
              if (parsedUser && parsedUser.role) {
                setAuth(parsedUser, storedToken, { access_token: storedToken, user: parsedUser } as any);
                return;
              }
            } catch {}
          }
        }
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
      if (isSubscribed) {
        if (typeof window !== 'undefined' && window.localStorage) {
          const storedToken = localStorage.getItem('rp_auth_token');
          const storedUser = localStorage.getItem('rp_auth_user');
          if (storedToken && storedUser) {
            try {
              const parsedUser = JSON.parse(storedUser);
              if (parsedUser && parsedUser.role) {
                setAuth(parsedUser, storedToken, { access_token: storedToken, user: parsedUser } as any);
                return;
              }
            } catch {}
          }
        }
        logout();
      }
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
      <React.Suspense fallback={<PageLoader />}>
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
            <Route path="whatsapp" element={<ProtectedRoute requireAdmin><WhatsAppSettings /></ProtectedRoute>} />
            <Route path="agents" element={<ProtectedRoute requireAdmin><Agents /></ProtectedRoute>} />
            <Route path="invoices" element={<ProtectedRoute requireAdmin><Invoices /></ProtectedRoute>} />
            <Route path="visits" element={<Visits />} />
            <Route path="feedback" element={<Feedback />} />
          </Route>

          {/* Catch-all fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </React.Suspense>
    </BrowserRouter>
  );
}
