import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchVideoFeed, type VideoFeedResponse } from './feed.api';
import { apiClient } from '../../../lib/axios';

// Mock the axios apiClient instance
vi.mock('../../../lib/axios', () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

describe('feed.api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchVideoFeed', () => {
    it('fetches video feed successfully with default pagination parameters', async () => {
      const mockResponseData: VideoFeedResponse = {
        videos: [
          {
            id: 'video-1',
            title: 'Sample Feed Video',
            description: 'A description for the video',
            createdAt: '2026-03-10T12:00:00Z',
            thumbnailUrl: 'http://localhost/thumbs/video-1.jpg',
            playbackUrl: 'http://localhost/hls/video-1.m3u8',
            status: 'READY',
            user: {
              id: 'user-1',
              username: 'johndoe',
              name: 'John Doe',
            },
          },
        ],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
        },
      };

      vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
        data: mockResponseData,
      });

      const result = await fetchVideoFeed();

      expect(apiClient.get).toHaveBeenCalledWith('/video/feed', {
        params: { page: 1, limit: 10 },
      });
      expect(result).toEqual(mockResponseData);
    });

    it('fetches video feed with custom page and limit parameters', async () => {
      const mockResponseData: VideoFeedResponse = {
        videos: [],
        pagination: {
          page: 3,
          limit: 25,
          total: 100,
          totalPages: 4,
        },
      };

      vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
        data: mockResponseData,
      });

      const result = await fetchVideoFeed(3, 25);

      expect(apiClient.get).toHaveBeenCalledWith('/video/feed', {
        params: { page: 3, limit: 25 },
      });
      expect(result).toEqual(mockResponseData);
    });

    it('propagates API client errors when endpoint fails', async () => {
      const mockError = new Error('Network Error');
      vi.spyOn(apiClient, 'get').mockRejectedValueOnce(mockError);

      await expect(fetchVideoFeed(1, 10)).rejects.toThrow('Network Error');
      expect(apiClient.get).toHaveBeenCalledWith('/video/feed', {
        params: { page: 1, limit: 10 },
      });
    });
  });
});