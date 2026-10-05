import React, { useState } from 'react';
import { type FeedVideo } from '../api/feed.api';

interface VideoCardProps {
  video: FeedVideo;
  onSelect: (videoId: string) => void;
}

export const VideoCard: React.FC<VideoCardProps> = ({ video, onSelect }) => {
  const [imgError, setImgError] = useState(false);

  const showThumbnail = Boolean(video.thumbnailUrl) && !imgError;

  console.log(video, 'video');
  return (
    <div
      onClick={() => onSelect(video.id)}
      className="group bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg hover:border-slate-700 hover:shadow-2xl transition-all duration-300 cursor-pointer flex flex-col"
    >
      {/* Thumbnail Area */}
      <div className="relative aspect-video w-full bg-slate-950 overflow-hidden flex items-center justify-center">
        {showThumbnail ? (
          <img
            src={video.thumbnailUrl!}
            alt={video.title}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 text-slate-600">
            <svg className="w-10 h-10 stroke-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-xs uppercase font-medium tracking-wider text-slate-500">No Preview</span>
          </div>
        )}

        {/* Play Icon Hover Overlay */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-red-600 text-white flex items-center justify-center shadow-xl">
            <svg className="w-6 h-6 fill-current translate-x-0.5" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="p-4 flex flex-col gap-2 flex-1">
        <h4 className="font-bold text-white text-base line-clamp-1 group-hover:text-red-500 transition-colors">
          {video.title || 'Untitled Video'}
        </h4>
        {video.description && (
          <p className="text-xs text-slate-400 line-clamp-2">{video.description}</p>
        )}
        <div className="mt-auto pt-2 flex items-center gap-2 border-t border-slate-800/60 text-xs text-slate-500">
          <span className="font-semibold text-slate-300">@{video.user.name}</span>
          <span>•</span>
          <span>{new Date(video.createdAt).toLocaleDateString()}</span>
        </div>
      </div>
    </div>
  );
};