import React, { useState } from 'react';
import { Navbar } from '../../../components/layout/Navbar';
import { VideoUploader } from '../components/VideoUploader';
import { HlsPlayer } from '../components/HlsPlayer';
import { getVideoStreamUrl } from '../api/creator.api';

export const CreatorStudioPage: React.FC = () => {
  const [activeVideoId, setActiveVideoId] = useState<string>('');
  const [streamUrl, setStreamUrl] = useState<string>('');

  const handleUploadSuccess = (videoId: string) => {
    setActiveVideoId(videoId);
  };

  const handleLoadStream = async () => {
    if (!activeVideoId) return;
    try {
      const res = await getVideoStreamUrl(activeVideoId);
      if (res.success) {
        setStreamUrl(res.streamUrl);
      }
    } catch {
      alert('Video is still processing. Please try again in a few seconds.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Navbar />

      <main className="px-8 lg:px-16 py-10 max-w-7xl mx-auto space-y-8">
        {/* Header Banner */}
        <div className="flex flex-col gap-2 border-b border-slate-800 pb-6">
          <span className="inline-flex items-center gap-2 px-3 py-1 bg-red-600/20 border border-red-500/30 rounded-full text-red-500 text-xs font-bold uppercase tracking-wider w-fit">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> Live Pipeline
          </span>
          <h1 className="text-4xl font-black tracking-tight text-white">
            CREATOR <span className="text-red-600">STUDIO</span>
          </h1>
          <p className="text-slate-400 text-sm">
            Upload raw video assets to dispatch FFmpeg HLS encoding jobs across the worker cluster.
          </p>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <VideoUploader onSuccess={handleUploadSuccess} />

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
              <h3 className="text-lg font-bold text-white tracking-wide">Preview HLS Stream</h3>
              <span className="text-xs font-mono text-slate-500">hls.js engine</span>
            </div>

            <div className="flex gap-3">
              <input
                type="text"
                placeholder="Enter Video ID..."
                value={activeVideoId}
                onChange={(e) => setActiveVideoId(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 focus:border-red-600 focus:ring-1 focus:ring-red-600 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none transition-all font-mono"
              />
              <button
                onClick={handleLoadStream}
                className="bg-red-600 hover:bg-red-700 text-white font-bold px-5 py-2.5 rounded-xl shadow-lg shadow-red-600/20 transition-all text-sm shrink-0"
              >
                Load Stream
              </button>
            </div>

            {streamUrl ? (
              <HlsPlayer src={streamUrl} />
            ) : (
              <div className="w-full aspect-video bg-slate-950 border border-slate-800/80 rounded-xl flex flex-col items-center justify-center gap-3 text-slate-500">
                <svg className="w-10 h-10 stroke-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-xs tracking-wider uppercase font-medium text-slate-600">No active stream loaded</span>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};