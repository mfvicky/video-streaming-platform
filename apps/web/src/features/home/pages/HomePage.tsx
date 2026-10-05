import React, { useState, useMemo, useRef } from 'react';
import { Navbar } from '../../../components/layout/Navbar';
import { Footer } from '../../../components/layout/Footer';
import { useInfiniteVideoFeed } from '../../feed/hooks/useVideoFeed';
import { VideoCard } from '../../feed/components/VideoCard';
import { HlsPlayer } from '../../creator/components/HlsPlayer';
import { getVideoStreamUrl, getVideoThumbnailUrl } from '../../creator/api/creator.api';
import type { FeedVideo } from '../../feed/api/feed.api';

export const HomePage: React.FC = () => {
  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteVideoFeed(12);

  const [selectedStreamUrl, setSelectedStreamUrl] = useState<string>('');
  const [selectedThumbnailUrl, setSelectedThumbnailUrl] = useState<string>('');
  const [isPlayingTitle, setIsPlayingTitle] = useState<string>('');
  const [loadingVideoId, setLoadingVideoId] = useState<string | null>(null);

  // Ref to target for smooth scrolling
  const playerRef = useRef<HTMLDivElement | null>(null);

  // Safely extract videos regardless of backend pagination wrap format
  const videos: FeedVideo[] = useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap((page) => {
      if ('data' in page && Array.isArray((page as { data: FeedVideo[] }).data)) {
        return (page as { data: FeedVideo[] }).data;
      }
      if ('videos' in page && Array.isArray((page as { videos: FeedVideo[] }).videos)) {
        return (page as { videos: FeedVideo[] }).videos;
      }
      if (Array.isArray(page)) {
        return page as FeedVideo[];
      }
      return [];
    });
  }, [data]);

  const featuredVideo = videos.length > 0 ? videos[0] : null;

  const handleSelectVideo = async (videoId: string, title?: string) => {
    try {
      setLoadingVideoId(videoId);
      const [streamRes, thumbnailRes] = await Promise.allSettled([
        getVideoStreamUrl(videoId),
        getVideoThumbnailUrl(videoId),
      ]);

      if (streamRes.status === 'fulfilled' && streamRes.value?.success) {
        setSelectedStreamUrl(streamRes.value.streamUrl);
        setIsPlayingTitle(title || 'Now Playing');

        // Scroll smooth to player position or top of main section
        setTimeout(() => {
          if (playerRef.current) {
            playerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
          } else {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        }, 100);
      } else {
        alert('Stream URL is not ready or failed to load.');
      }

      if (thumbnailRes.status === 'fulfilled' && thumbnailRes.value?.thumbnailUrl) {
        setSelectedThumbnailUrl(thumbnailRes.value.thumbnailUrl);
      } else {
        setSelectedThumbnailUrl('');
      }
    } catch {
      alert('Failed to initialize stream player.');
    } finally {
      setLoadingVideoId(null);
    }
  };

  const handleClosePlayer = () => {
    setSelectedStreamUrl('');
    setSelectedThumbnailUrl('');
    setIsPlayingTitle('');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Navbar />

      {/* Hero Section */}
      <section className="relative h-[80vh] flex items-center justify-start px-8 lg:px-16 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src={
              featuredVideo?.thumbnailUrl ||
              'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=1920&q=80'
            }
            alt="Hero Stream"
            className="w-full h-full object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-transparent" />
        </div>

        <div className="relative z-10 max-w-2xl space-y-6">
          <span className="inline-flex items-center gap-2 px-3 py-1 bg-red-600/20 border border-red-500/30 rounded-full text-red-500 text-xs font-semibold uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> Live Now
          </span>
          <h1 className="text-5xl lg:text-6xl font-black tracking-tight text-white leading-none">
            UNLIMITED <span className="text-red-600">STREAMS</span>, ZERO LIMITS.
          </h1>
          <p className="text-slate-300 text-lg">
            {featuredVideo
              ? featuredVideo.title
              : 'Discover high-bitrate live streams, 4K videos, and exclusive content creator channels from around the world.'}
          </p>

          <div className="flex items-center gap-4 pt-2">
            <button
              disabled={!featuredVideo || loadingVideoId === featuredVideo.id}
              onClick={() => featuredVideo && handleSelectVideo(featuredVideo.id, featuredVideo.title)}
              className="px-8 py-3.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 font-bold rounded-xl shadow-lg shadow-red-600/30 transition-all transform hover:scale-105 cursor-pointer"
            >
              {loadingVideoId === featuredVideo?.id ? 'Loading...' : 'Watch Featured Stream'}
            </button>
            <a
              href="#feed"
              className="px-8 py-3.5 bg-slate-900/80 hover:bg-slate-800 border border-slate-700 font-bold rounded-xl backdrop-blur-sm transition-all inline-block"
            >
              Explore Library
            </a>
          </div>
        </div>
      </section>

      {/* Main Section */}
      <main id="feed" className="px-8 lg:px-16 py-12 max-w-7xl mx-auto space-y-10">
        {/* Active HLS Stream Player Modal/Banner */}
        {selectedStreamUrl && (
          <div
            ref={playerRef}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4 animate-in fade-in duration-300 scroll-mt-6"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                <h3 className="font-bold text-white text-lg line-clamp-1">{isPlayingTitle}</h3>
              </div>
              <button
                onClick={handleClosePlayer}
                className="text-xs font-semibold text-slate-400 hover:text-white px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
              >
                Close Player ✕
              </button>
            </div>
            <div className="flex justify-center">
              <HlsPlayer src={selectedStreamUrl} poster={selectedThumbnailUrl} />
            </div>
          </div>
        )}

        {/* Video Feed Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white tracking-wide">Trending Content</h2>
          <span className="text-xs text-slate-500 uppercase tracking-widest font-semibold">
            Status: READY
          </span>
        </div>

        {/* Initial Loading Skeleton */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden animate-pulse h-64"
              >
                <div className="aspect-video bg-slate-800" />
                <div className="p-5 space-y-3">
                  <div className="h-4 bg-slate-800 rounded w-3/4" />
                  <div className="h-3 bg-slate-800 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {isError && (
          <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl text-slate-400">
            Failed to load READY videos from feed.
          </div>
        )}

        {/* Video Grid */}
        {videos.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {videos.map((video) => (
                <VideoCard
                  key={video.id}
                  video={video}
                  onSelect={(id) => handleSelectVideo(id, video.title)}
                />
              ))}
            </div>

            {/* Load More Button */}
            {hasNextPage && (
              <div className="flex justify-center pt-8">
                <button
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  className="px-8 py-3 bg-slate-900 hover:bg-slate-800 border border-slate-700 font-semibold rounded-xl transition-all cursor-pointer disabled:opacity-50"
                >
                  {isFetchingNextPage ? 'Loading more streams...' : 'Load More Content'}
                </button>
              </div>
            )}
          </>
        )}

        {/* Empty State */}
        {!isLoading && !isError && videos.length === 0 && (
          <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-2xl text-slate-400 space-y-2">
            <p className="text-lg font-bold text-slate-300">No ready streams found</p>
            <p className="text-xs text-slate-500">Upload a video in Creator Studio to see it listed here.</p>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};