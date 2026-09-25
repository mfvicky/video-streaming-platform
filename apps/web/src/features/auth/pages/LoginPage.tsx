import React from 'react';
import { LoginForm } from '../components/LoginForm';

export const LoginPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex items-center justify-center p-4 relative overflow-hidden transition-colors duration-200">
      {/* Background glow effects */}
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-red-500/10 dark:bg-red-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-indigo-500/10 dark:bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

      {/* Embedded Form Component */}
      <LoginForm />
    </div>
  );
};