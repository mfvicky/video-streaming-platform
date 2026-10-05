import React, { useEffect, useState, useCallback } from 'react';
import { toast } from 'react-toastify';
import {
  getMyVideos,
  retryVideoProcessingApi,
  deleteVideoApi,
  type CreatorVideo,
} from '../api/creator.api';

interface VideoListProps {
  creatorId: string;
  onSelectVideo: (videoId: string) => void;
  selectedVideoId?: string;
  refreshKey?: number;
}

export const VideoList: React.FC<VideoListProps> = ({
  onSelectVideo,
  selectedVideoId,
  refreshKey,
}) => {
  const [videos, setVideos] = useState<CreatorVideo[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [retryingVideoIds, setRetryingVideoIds] = useState<Set<string>>(new Set());
  const [deletingVideoIds, setDeletingVideoIds] = useState<Set<string>>(new Set());

  const fetchVideos = useCallback(async () => {
    try {
      const data = await getMyVideos();
      setVideos(data || []);
    } catch (error) {
      console.error('Failed to fetch creator videos:', error);
      toast.error('Failed to load video list');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        const data = await getMyVideos();
        if (isMounted) {
          setVideos(data || []);
        }
      } catch (error) {
        if (isMounted) {
          console.error('Failed to fetch creator videos:', error);
          toast.error('Failed to load video list');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [refreshKey]);

  useEffect(() => {
    const hasPendingVideos = videos.some(
      (v) => v.status === 'PENDING' || v.status === 'PROCESSING'
    );

    if (!hasPendingVideos) return;

    const interval = setInterval(() => {
      fetchVideos();
    }, 25000);

    return () => clearInterval(interval);
  }, [videos, fetchVideos]);

  const handleRetry = async (videoId: string) => {
    setRetryingVideoIds((prev) => new Set(prev).add(videoId));

    try {
      await retryVideoProcessingApi(videoId);
      toast.info('Video re-queued for processing');
      await fetchVideos();
    } catch (error) {
      console.error('Failed to retry video processing:', error);
      toast.error('Failed to re-queue video processing');
    } finally {
      setRetryingVideoIds((prev) => {
        const next = new Set(prev);
        next.delete(videoId);
        return next;
      });
    }
  };

  const handleDelete = async (videoId: string) => {
    if (!window.confirm('Are you sure you want to delete this video? This cannot be undone.')) {
      return;
    }

    setDeletingVideoIds((prev) => new Set(prev).add(videoId));

    try {
      await deleteVideoApi(videoId);
      setVideos((prev) => prev.filter((v) => v.id !== videoId));
      toast.success('Video deleted successfully');
    } catch (error) {
      console.error('Failed to delete video:', error);
      toast.error('Failed to delete video');
    } finally {
      setDeletingVideoIds((prev) => {
        const next = new Set(prev);
        next.delete(videoId);
        return next;
      });
    }
  };

  // Helper function to format ISO timestamps into human-readable strings
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown date';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const getStatusBadge = (status: CreatorVideo['status']) => {
    switch (status) {
      case 'READY':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Ready
          </span>
        );
      case 'PROCESSING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
            Processing
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            Pending
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
            Failed
          </span>
        );
    }
  };

  const renderActionButton = (video: CreatorVideo) => {
    const isRetrying = retryingVideoIds.has(video.id);

    switch (video.status) {
      case 'READY':
        return (
          <button
            type="button"
            onClick={() => onSelectVideo(video.id)}
            className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-600/10"
          >
            Preview
          </button>
        );

      case 'FAILED':
        return (
          <button
            type="button"
            disabled={isRetrying}
            onClick={() => handleRetry(video.id)}
            className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all bg-amber-600 hover:bg-amber-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white shadow-md shadow-amber-600/10 flex items-center gap-1.5"
          >
            {isRetrying ? (
              <>
                <svg className="w-3 h-3 animate-spin text-slate-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Queuing...
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Retry
              </>
            )}
          </button>
        );

      case 'PENDING':
      case 'PROCESSING':
      default:
        return (
          <button
            type="button"
            disabled
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 bg-slate-800/50 cursor-not-allowed border border-slate-800"
          >
            Processing...
          </button>
        );
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
        <h3 className="text-lg font-bold text-white tracking-wide">
          Your Uploaded Videos
        </h3>
        <button
          type="button"
          onClick={fetchVideos}
          className="text-xs font-semibold text-slate-400 hover:text-white transition-colors flex items-center gap-1"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {isLoading ? (
        <div className="py-8 text-center text-sm text-slate-500 animate-pulse">
          Loading videos...
        </div>
      ) : videos.length === 0 ? (
        <div className="py-8 text-center text-sm text-slate-500">
          No uploaded videos found. Upload a video above to get started.
        </div>
      ) : (
        <div className="divide-y divide-slate-800/60 max-h-80 overflow-y-auto pr-1">
          {videos.map((video) => {
            const isSelected = selectedVideoId === video.id;
            const isDeleting = deletingVideoIds.has(video.id);

            return (
              <div
                key={video.id}
                className={`py-3 px-3 rounded-xl transition-all flex items-center justify-between gap-4 ${
                  isSelected ? 'bg-slate-800/80 border border-slate-700' : 'hover:bg-slate-800/40'
                }`}
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-sm font-semibold text-slate-200 truncate">
                    {video.title || 'Untitled Video'}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-slate-500 font-mono">
                    <span className="truncate">ID: {video.id}</span>
                    <span>|</span>
                    <span className="text-slate-500 font-mono">
                      Uploaded: {formatDate(video.updatedAt)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {getStatusBadge(video.status)}
                  {renderActionButton(video)}

                  {/* Delete Button */}
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={() => handleDelete(video.id)}
                    title="Delete video"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isDeleting ? (
                      <svg className="w-4 h-4 animate-spin text-red-400" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};