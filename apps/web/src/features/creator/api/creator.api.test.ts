import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  uploadCreatorVideo,
  getVideoStreamUrl,
  getVideoThumbnailUrl,
  getMyVideos,
  retryVideoProcessingApi,
  deleteVideoApi,
  type CreatorVideo,
} from './creator.api';
import { apiClient } from '../../../lib/axios';

// Mock the axios apiClient instance
vi.mock('../../../lib/axios', () => ({
  apiClient: {
    post: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('creator.api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('uploadCreatorVideo', () => {
    it('sends formData to /video/upload endpoint and returns response data', async () => {
      const mockResponse = { success: true, videoId: 'vid-123' };
      const mockFormData = new FormData();
      mockFormData.append('file', new File(['dummy'], 'test.mp4', { type: 'video/mp4' }));

      vi.spyOn(apiClient, 'post').mockResolvedValueOnce({ data: mockResponse });

      const result = await uploadCreatorVideo(mockFormData);

      expect(apiClient.post).toHaveBeenCalledWith('/video/upload', mockFormData);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getVideoStreamUrl', () => {
    it('fetches stream URL for a given video ID', async () => {
      const mockResponse = { success: true, streamUrl: 'http://localhost/hls/vid-123.m3u8' };
      vi.spyOn(apiClient, 'get').mockResolvedValueOnce({ data: mockResponse });

      const result = await getVideoStreamUrl('vid-123');

      expect(apiClient.get).toHaveBeenCalledWith('/video/stream/vid-123');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getVideoThumbnailUrl', () => {
    it('fetches thumbnail URL for a given video ID', async () => {
      const mockResponse = { success: true, thumbnailUrl: 'http://localhost/thumbs/vid-123.jpg' };
      vi.spyOn(apiClient, 'get').mockResolvedValueOnce({ data: mockResponse });

      const result = await getVideoThumbnailUrl('vid-123');

      expect(apiClient.get).toHaveBeenCalledWith('/video/thumbnail/vid-123');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getMyVideos', () => {
    it('fetches creator videos array from /video/creator endpoint', async () => {
      const mockVideos: CreatorVideo[] = [
        {
          id: 'vid-123',
          title: 'Sample Video',
          status: 'READY',
          rawPath: '/raw/vid-123.mp4',
          thumbnailPath: '/thumbs/vid-123.jpg',
          createdAt: '2026-03-01T10:00:00Z',
          updatedAt: '2026-03-01T10:05:00Z',
        },
      ];

      vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
        data: { videos: mockVideos },
      });

      const result = await getMyVideos();

      expect(apiClient.get).toHaveBeenCalledWith('/video/creator');
      expect(result).toEqual(mockVideos);
    });
  });

  describe('retryVideoProcessingApi', () => {
    it('posts retry request for a given video ID', async () => {
      const mockResponse = { success: true, message: 'Processing retried' };
      vi.spyOn(apiClient, 'post').mockResolvedValueOnce({ data: mockResponse });

      const result = await retryVideoProcessingApi('vid-123');

      expect(apiClient.post).toHaveBeenCalledWith('/video/retry/vid-123');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('deleteVideoApi', () => {
    it('sends DELETE request for a given video ID', async () => {
      const mockResponse = { success: true, message: 'Video deleted successfully' };
      vi.spyOn(apiClient, 'delete').mockResolvedValueOnce({ data: mockResponse });

      const result = await deleteVideoApi('vid-123');

      expect(apiClient.delete).toHaveBeenCalledWith('/video/vid-123');
      expect(result).toEqual(mockResponse);
    });
  });
});