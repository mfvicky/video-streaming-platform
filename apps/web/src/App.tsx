import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { queryClient } from './lib/react-query';
import { AppRoutes } from './routes/AppRoutes';

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppRoutes />
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