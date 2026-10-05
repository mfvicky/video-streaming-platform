import { apiClient } from '../../../lib/axios';

export interface FeedVideo {
  id: string;
  title: string;
  description?: string;
  createdAt: string;
  thumbnailUrl: string | null;
  playbackUrl?: string | null; // HLS playlist URL (.m3u8) or direct video URL
  status?: 'PROCESSING' | 'READY' | 'FAILED';
  user: {
    id: string;
    username?: string;
    name?: string;
    avatar?: string;
  };
}

export interface VideoFeedResponse {
  videos: FeedVideo[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const fetchVideoFeed = async (page = 1, limit = 10): Promise<VideoFeedResponse> => {
  const response = await apiClient.get<VideoFeedResponse>('/video/feed', {
    params: { page, limit },
  });
  return response.data;
};