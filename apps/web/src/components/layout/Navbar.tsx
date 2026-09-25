import React from 'react';
import { Link } from 'react-router-dom';

export const Navbar: React.FC = () => {
  const token = localStorage.getItem('accessToken');

  return (
    <nav className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80 px-8 lg:px-16 py-4 flex items-center justify-between">
      <Link to="/" className="text-2xl font-black text-red-600 tracking-wider">
        STREAM<span className="text-white">VERSE</span>
      </Link>

      <div className="flex items-center gap-4">
        {token ? (
          <button
            onClick={() => {
              localStorage.removeItem('accessToken');
              window.location.reload();
            }}
            className="px-5 py-2 text-sm bg-slate-900 hover:bg-slate-800 border border-slate-700 font-semibold rounded-xl transition-all"
          >
            Sign Out
          </button>
        ) : (
          <>
            <Link
              to="/login"
              className="px-5 py-2 text-sm text-slate-300 hover:text-white font-medium transition-colors"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="px-5 py-2 text-sm bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-all shadow-md shadow-red-600/20"
            >
              Get Started
            </Link>
          </>
        )}
      </div>
    </nav>
  );
};