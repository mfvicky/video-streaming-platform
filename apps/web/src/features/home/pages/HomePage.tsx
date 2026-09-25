import React from 'react';
import { Navbar } from '../../../components/layout/Navbar';

interface FeaturedVideo {
  id: string;
  title: string;
  creator: string;
  views: string;
  duration: string;
  thumbnail: string;
}

const FEATURED_VIDEOS: FeaturedVideo[] = [
  {
    id: '1',
    title: 'Cyberpunk 2077: Phantom Liberty 4K Ultra Walkthrough',
    creator: 'NeonGamer',
    views: '142K views',
    duration: '24:15',
    thumbnail: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: '2',
    title: 'Building a Microservices Architecture in Node.js',
    creator: 'DevMaster',
    views: '89K views',
    duration: '45:00',
    thumbnail: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: '3',
    title: 'Lo-Fi Chill Beats for Live Coding & Studying',
    creator: 'ChillRadio',
    views: '1.2M views',
    duration: 'LIVE',
    thumbnail: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=800&q=80',
  },
];

export const HomePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Navbar />

      {/* Hero Section */}
      <section className="relative h-[80vh] flex items-center justify-start px-8 lg:px-16 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=1920&q=80"
            alt="Hero Stream"
            className="w-full h-full object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-linear-to-t from-slate-950 via-slate-950/60 to-transparent" />
          <div className="absolute inset-0 bg-linear-to-r from-slate-950 via-slate-950/80 to-transparent" />
        </div>

        <div className="relative z-10 max-w-2xl space-y-6">
          <span className="inline-flex items-center gap-2 px-3 py-1 bg-red-600/20 border border-red-500/30 rounded-full text-red-500 text-xs font-semibold uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> Live Now
          </span>
          <h1 className="text-5xl lg:text-6xl font-black tracking-tight text-white leading-none">
            UNLIMITED <span className="text-red-600">STREAMS</span>, ZERO LIMITS.
          </h1>
          <p className="text-slate-300 text-lg">
            Discover high-bitrate live streams, 4K videos, and exclusive content creator channels from around the world.
          </p>

          <div className="flex items-center gap-4 pt-2">
            <button className="px-8 py-3.5 bg-red-600 hover:bg-red-700 font-bold rounded-xl shadow-lg shadow-red-600/30 transition-all transform hover:scale-105">
              Watch Stream
            </button>
            <button className="px-8 py-3.5 bg-slate-900/80 hover:bg-slate-800 border border-slate-700 font-bold rounded-xl backdrop-blur-sm transition-all">
              Explore Library
            </button>
          </div>
        </div>
      </section>

      {/* Trending Streams Grid */}
      <main className="px-8 lg:px-16 py-12 max-w-7xl mx-auto">
        <h2 className="text-2xl font-bold mb-8 text-white tracking-wide">Trending Content</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURED_VIDEOS.map((video) => (
            <div
              key={video.id}
              className="group bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-slate-700 transition-all duration-300 hover:shadow-xl hover:shadow-red-950/20"
            >
              <div className="relative aspect-video overflow-hidden">
                <img
                  src={video.thumbnail}
                  alt={video.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <span className="absolute bottom-3 right-3 px-2.5 py-1 bg-slate-950/80 backdrop-blur-md rounded-md text-xs font-semibold">
                  {video.duration}
                </span>
              </div>

              <div className="p-5">
                <h3 className="font-semibold text-slate-100 group-hover:text-red-500 transition-colors line-clamp-2">
                  {video.title}
                </h3>
                <div className="flex items-center justify-between mt-4 text-xs text-slate-400">
                  <span className="font-medium text-slate-300">{video.creator}</span>
                  <span>{video.views}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};