import React from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { HomePage } from '../features/home/pages/HomePage';
import { LoginPage } from '../features/auth/pages/LoginPage';
import { RegisterPage } from '../features/auth/pages/RegisterPage';
import { CreatorStudioPage } from '../features/creator/pages/CreatorStudioPage';

const ProtectedLayout = () => {
  const token = localStorage.getItem('accessToken');
  return token ? <Outlet /> : <Navigate to="/login" replace />;
};

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Protected Creator Routes */}
      <Route element={<ProtectedLayout />}>
        <Route path="/creator" element={<CreatorStudioPage />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};