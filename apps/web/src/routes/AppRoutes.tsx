import React from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { HomePage } from '../features/home/pages/HomePage';
import { LoginPage } from '../features/auth/pages/LoginPage';
import { RegisterPage } from '../features/auth/pages/RegisterPage';
import { CreatorStudioPage } from '../features/creator/pages/CreatorStudioPage';
import { AdminDashboardPage } from '../features/admin/pages/AdminDashboardPage';
import { useSession } from '../features/auth/hooks/useSession';
import { PrivacyPolicyPage } from '../features/home/pages/PrivacyPolicyPage';
import { TermsOfServicePage } from '../features/home/pages/TermsOfServicePage';

interface ProtectedLayoutProps {
  allowedRoles?: string[];
}

const ProtectedLayout: React.FC<ProtectedLayoutProps> = ({ allowedRoles }) => {
  const { data: user, isPending, isError } = useSession();
  if (isPending) return <div role="status">Checking session...</div>;
  if (isError || !user) return <Navigate to="/login" replace />;
  if (allowedRoles?.length && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/privacy" element={<PrivacyPolicyPage />} />
      <Route path="/terms" element={<TermsOfServicePage />} />
      {/* Protected Creator Routes: Allow 'CREATOR' and 'ADMIN' */}
      <Route element={<ProtectedLayout allowedRoles={['CREATOR', 'ADMIN']} />}>
        <Route path="/creator" element={<CreatorStudioPage />} />
      </Route>

      <Route element={<ProtectedLayout allowedRoles={['ADMIN']} />}>
        <Route path="/admin" element={<AdminDashboardPage />} />
      </Route>
      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
