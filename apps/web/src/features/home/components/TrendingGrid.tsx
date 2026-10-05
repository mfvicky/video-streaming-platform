import React from 'react';
import { VideoCard, type VideoCardProps } from '../../../components/ui/VideoCard';

const MOCK_VIDEOS: VideoCardProps[] = [
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
    title: 'Building Scalable Microservices with Express 5 & Redis',
    creator: 'DevMaster',
    views: '89K views',
    duration: '45:00',
    thumbnail: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: '3',
    title: 'Lo-Fi Beats for Coding & Deep Work Sessions',
    creator: 'ChillRadio',
    views: '1.2M views',
    duration: 'LIVE',
    thumbnail: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=800&q=80',
  },
];

export const TrendingGrid: React.FC = () => {
  return (
    <section className="px-8 lg:px-16 py-12 max-w-7xl mx-auto">
      <h2 className="text-2xl font-bold mb-8 text-white tracking-wide">Trending Streams</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {MOCK_VIDEOS.map((video) => (
          <VideoCard key={video.id} {...video} />
        ))}
      </div>
    </section>
  );
};