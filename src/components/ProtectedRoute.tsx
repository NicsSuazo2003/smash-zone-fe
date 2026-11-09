// src/components/ProtectedRoute.tsx
import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: ('admin' | 'staff')[];
  redirectTo?: string;
}

export function ProtectedRoute({ 
  children, 
  allowedRoles = ['admin'], 
  redirectTo = '/login' 
}: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  if (allowedRoles.length > 0 && user && !allowedRoles.includes(user.role)) {
    // Redirect staff to staff bookings, others to login
    if (user.role === 'staff') {
      return <Navigate to="/staff/bookings" replace />;
    }
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}