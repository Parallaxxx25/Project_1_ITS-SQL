import React from 'react';
import { isAuthenticated } from '../lib/auth-api';

/**
 * ProtectedRoute — renders children only when a valid (non-expired) JWT exists.
 * Framework-agnostic (this app uses state-based navigation, not react-router).
 *
 * Usage A (state router):
 *   <ProtectedRoute fallback={<LoginForm onSuccess={...} />}>
 *     <Dashboard />
 *   </ProtectedRoute>
 *
 * Usage B (react-router): pass onDeny to trigger a redirect, e.g.
 *   <ProtectedRoute onDeny={() => navigate('/login')}>...</ProtectedRoute>
 */
export default function ProtectedRoute({ children, fallback = null, onDeny }) {
  const authed = isAuthenticated();

  React.useEffect(() => {
    if (!authed && typeof onDeny === 'function') onDeny();
  }, [authed, onDeny]);

  if (!authed) return fallback;
  return <>{children}</>;
}
