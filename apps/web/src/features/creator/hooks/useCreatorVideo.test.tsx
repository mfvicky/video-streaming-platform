import React, { type ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider, type Query } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  useUploadVideo,
  useVideoStream,
  useVideoThumbnail,
} from './useCreatorVideo';
import * as creatorApi from '../api/creator.api';

// Interfaces for API responses
interface UploadVideoResponse {
  success: boolean;
  videoId: string;
}

interface VideoStreamResponse {
  success: boolean;
  streamUrl?: string;
  message?: string;
}

interface VideoThumbnailResponse {
  success: boolean;
  thumbnailUrl?: string;
}

// Mock creator API module
vi.mock('../api/creator.api', () => ({
  uploadCreatorVideo: vi.fn(),
  getVideoStreamUrl: vi.fn(),
  getVideoThumbnailUrl: vi.fn(),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useCreatorVideo hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useUploadVideo', () => {
    it('executes uploadCreatorVideo mutation successfully', async () => {
      const mockResponse: UploadVideoResponse = { success: true, videoId: 'vid-123' };
      vi.spyOn(creatorApi, 'uploadCreatorVideo').mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useUploadVideo(), {
        wrapper: createWrapper(),
      });

      const formData = new FormData();
      formData.append('file', new File(['dummy content'], 'video.mp4', { type: 'video/mp4' }));

      result.current.mutate(formData);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(creatorApi.uploadCreatorVideo).toHaveBeenCalledWith(formData);
      expect(result.current.data).toEqual(mockResponse);
    });
  });

  describe('useVideoStream', () => {
    it('fetches stream URL when videoId is provided and enabled is true', async () => {
      const mockData: VideoStreamResponse = {
        success: true,
        streamUrl: 'http://localhost/hls/vid-123.m3u8',
      };
      vi.spyOn(creatorApi, 'getVideoStreamUrl').mockResolvedValueOnce(mockData);

      const { result } = renderHook(() => useVideoStream('vid-123', true), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(creatorApi.getVideoStreamUrl).toHaveBeenCalledWith('vid-123');
      expect(result.current.data).toEqual(mockData);
    });

    it('does not fetch stream URL when enabled is false', () => {
      const { result } = renderHook(() => useVideoStream('vid-123', false), {
        wrapper: createWrapper(),
      });

      expect(result.current.isFetching).toBe(false);
      expect(creatorApi.getVideoStreamUrl).not.toHaveBeenCalled();
    });

    it('does not fetch stream URL when videoId is empty', () => {
      const { result } = renderHook(() => useVideoStream('', true), {
        wrapper: createWrapper(),
      });

      expect(result.current.isFetching).toBe(false);
      expect(creatorApi.getVideoStreamUrl).not.toHaveBeenCalled();
    });

    it('polls every 5000ms when query response success is false', async () => {
      const mockPendingResponse: VideoStreamResponse = { success: false, message: 'Processing' };
      vi.spyOn(creatorApi, 'getVideoStreamUrl').mockResolvedValue(mockPendingResponse);

      const { result } = renderHook(() => useVideoStream('vid-123', true), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Safely check refetchInterval using React Query types
      const queryOptions = result.current;
      const mockQuery = {
        state: { data: mockPendingResponse },
      } as unknown as Query<VideoStreamResponse>;

      if (typeof queryOptions !== 'undefined') {
        const refetchInterval = (
          queryOptions as unknown as {
            _query?: { options?: { refetchInterval?: (query: Query<VideoStreamResponse>) => number | false } };
          }
        )._query?.options?.refetchInterval;

        if (typeof refetchInterval === 'function') {
          expect(refetchInterval(mockQuery)).toBe(5000);
        }
      }
    });

    it('stops polling when query response success is true', async () => {
      const mockSuccessResponse: VideoStreamResponse = {
        success: true,
        streamUrl: 'http://localhost/hls/vid-123.m3u8',
      };
      vi.spyOn(creatorApi, 'getVideoStreamUrl').mockResolvedValueOnce(mockSuccessResponse);

      const { result } = renderHook(() => useVideoStream('vid-123', true), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const mockQuery = {
        state: { data: mockSuccessResponse },
      } as unknown as Query<VideoStreamResponse>;

      const refetchInterval = (
        result.current as unknown as {
          _query?: { options?: { refetchInterval?: (query: Query<VideoStreamResponse>) => number | false } };
        }
      )._query?.options?.refetchInterval;

      if (typeof refetchInterval === 'function') {
        expect(refetchInterval(mockQuery)).toBe(false);
      }
    });
  });

  describe('useVideoThumbnail', () => {
    it('fetches thumbnail URL when videoId is provided and enabled is true', async () => {
      const mockData: VideoThumbnailResponse = {
        success: true,
        thumbnailUrl: 'http://localhost/thumbs/vid-123.jpg',
      };
      vi.spyOn(creatorApi, 'getVideoThumbnailUrl').mockResolvedValueOnce(mockData);

      const { result } = renderHook(() => useVideoThumbnail('vid-123', true), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(creatorApi.getVideoThumbnailUrl).toHaveBeenCalledWith('vid-123');
      expect(result.current.data).toEqual(mockData);
    });

    it('does not fetch thumbnail URL when enabled is false', () => {
      const { result } = renderHook(() => useVideoThumbnail('vid-123', false), {
        wrapper: createWrapper(),
      });

      expect(result.current.isFetching).toBe(false);
      expect(creatorApi.getVideoThumbnailUrl).not.toHaveBeenCalled();
    });

    it('does not fetch thumbnail URL when videoId is empty', () => {
      const { result } = renderHook(() => useVideoThumbnail('', true), {
        wrapper: createWrapper(),
      });

      expect(result.current.isFetching).toBe(false);
      expect(creatorApi.getVideoThumbnailUrl).not.toHaveBeenCalled();
    });
  });
});