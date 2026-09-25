import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-950 border-t border-slate-900 py-12 px-8 lg:px-16 mt-20 text-slate-400 text-sm">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <span className="text-xl font-black text-red-600 tracking-wider">
            STREAM<span className="text-white">VERSE</span>
          </span>
          <p className="mt-2 text-xs text-slate-500">
            Next-generation distributed video streaming & content distribution.
          </p>
        </div>

        <div className="flex items-center gap-6 text-xs text-slate-400">
          <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
          <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
          <a href="#" className="hover:text-white transition-colors">API Documentation</a>
        </div>

        <p className="text-xs text-slate-600">
          © {new Date().getFullYear()} StreamVerse. All rights reserved.
        </p>
      </div>
    </footer>
  );
};