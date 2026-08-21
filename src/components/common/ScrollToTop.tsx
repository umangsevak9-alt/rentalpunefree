import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Ensures that on route changes and fresh loads, the page starts at the top
 * on the hero section without automatic scroll jumps.
 */
export default function ScrollToTop() {
  const location = useLocation();

  useEffect(() => {
    // Disable browser default scroll restoration which causes sudden jumps on reload
    if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  }, []);

  useEffect(() => {
    // If there is no specific hash, immediately ensure we are at the top (hero section)
    if (!location.hash) {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
  }, [location.pathname, location.hash]);

  return null;
}
