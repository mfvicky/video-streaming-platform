import React from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { HomePage } from '../features/home/pages/HomePage';
import { LoginPage } from '../features/auth/pages/LoginPage';
import { RegisterPage } from '../features/auth/pages/RegisterPage';
import { CreatorStudioPage } from '../features/creator/pages/CreatorStudioPage';

interface ProtectedLayoutProps {
  allowedRoles?: string[];
}

const ProtectedLayout: React.FC<ProtectedLayoutProps> = ({ allowedRoles }) => {
  const token = localStorage.getItem('accessToken');
  const userRaw = localStorage.getItem('user');

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // If specific roles are required, validate user object and role
  if (allowedRoles && allowedRoles.length > 0) {
    if (!userRaw) {
      return <Navigate to="/login" replace />;
    }

    let isAuthorized = false;
    let isParseError = false;

    try {
      const user = JSON.parse(userRaw);
      if (user?.role && allowedRoles.includes(user.role)) {
        isAuthorized = true;
      }
    } catch {
      isParseError = true;
    }

    if (isParseError) {
      return <Navigate to="/login" replace />;
    }

    if (!isAuthorized) {
      // Redirect unauthorized users to home page
      return <Navigate to="/" replace />;
    }
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

      {/* Protected Creator Routes: Allow 'CREATOR' and 'ADMIN' */}
      <Route element={<ProtectedLayout allowedRoles={['CREATOR', 'ADMIN']} />}>
        <Route path="/creator" element={<CreatorStudioPage />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};