import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { queryClient } from './lib/react-query';
import { HomePage } from './features/home/pages/HomePage';
import { LoginPage } from './features/auth/pages/LoginPage';
import { RegisterPage } from './features/auth/pages/RegisterPage';

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Routes>
      </BrowserRouter>
      
      {/* Toastify Configuration */}
      <ToastContainer
        position="bottom-right"
        autoClose={3000}
        theme="dark"
        toastClassName="bg-slate-900 text-slate-100 border border-slate-800 rounded-xl"
      />
    </QueryClientProvider>
  );
};

export default App;