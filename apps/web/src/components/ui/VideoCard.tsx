import React from 'react';

export interface VideoCardProps {
  id: string;
  title: string;
  creator: string;
  views: string;
  duration: string;
  thumbnail: string;
}

export const VideoCard: React.FC<VideoCardProps> = ({
  title,
  creator,
  views,
  duration,
  thumbnail,
}) => {
  return (
    <div className="group bg-slate-900 border border-slate-800/80 rounded-2xl overflow-hidden hover:border-slate-700 transition-all duration-300 hover:shadow-2xl hover:shadow-red-950/20 cursor-pointer">
      <div className="relative aspect-video overflow-hidden">
        <img
          src={thumbnail}
          alt={title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <span className="absolute bottom-3 right-3 px-2 py-0.5 bg-slate-950/80 backdrop-blur-md rounded text-xs font-semibold text-slate-200">
          {duration}
        </span>
      </div>

      <div className="p-4">
        <h3 className="font-semibold text-slate-100 group-hover:text-red-500 transition-colors line-clamp-2">
          {title}
        </h3>
        <div className="flex items-center justify-between mt-3 text-xs text-slate-400">
          <span className="font-medium text-slate-300">{creator}</span>
          <span>{views}</span>
        </div>
      </div>
    </div>
  );
};