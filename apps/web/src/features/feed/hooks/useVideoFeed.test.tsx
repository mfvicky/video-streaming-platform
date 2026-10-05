import { type ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useInfiniteVideoFeed } from './useVideoFeed';
import * as feedApi from '../api/feed.api';

// Mock feed API module
vi.mock('../api/feed.api', () => ({
  fetchVideoFeed: vi.fn(),
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

describe('useInfiniteVideoFeed hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches initial page of video feed successfully', async () => {
    const mockFeedResponse: feedApi.VideoFeedResponse = {
      videos: [
        {
          id: 'vid-1',
          title: 'Feed Video 1',
          playbackUrl: '/raw/vid-1.mp4',
          thumbnailUrl: '/thumb/vid-1.jpg',
          createdAt: '2026-03-01T10:00:00Z',
          user: { id: 'usr-1', name: 'John Doe' },
        },
      ],
      pagination: {
        total: 20,
        page: 1,
        limit: 12,
        totalPages: 2,
      },
    };

    vi.spyOn(feedApi, 'fetchVideoFeed').mockResolvedValueOnce(mockFeedResponse);

    const { result } = renderHook(() => useInfiniteVideoFeed(12), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(feedApi.fetchVideoFeed).toHaveBeenCalledWith(1, 12);
    expect(result.current.data?.pages[0]).toEqual(mockFeedResponse);
    expect(result.current.hasNextPage).toBe(true);
  });

  it('fetches next page when fetchNextPage is invoked', async () => {
    const page1Response: feedApi.VideoFeedResponse = {
      videos: [
        {
          id: 'vid-1',
          title: 'Feed Video 1',
          playbackUrl: '/raw/vid-1.mp4',
          thumbnailUrl: '/thumb/vid-1.jpg',
          createdAt: '2026-03-01T10:00:00Z',
          user: { id: 'usr-1', name: 'John Doe' },
        },
      ],
      pagination: { total: 20, page: 1, limit: 10, totalPages: 2 },
    };

    const page2Response: feedApi.VideoFeedResponse = {
      videos: [
        {
          id: 'vid-2',
          title: 'Feed Video 2',
          playbackUrl: '/raw/vid-2.mp4',
          thumbnailUrl: '/thumb/vid-2.jpg',
          createdAt: '2026-03-01T11:00:00Z',
          user: { id: 'usr-2', name: 'Jane Doe' },
        },
      ],
      pagination: { total: 20, page: 2, limit: 10, totalPages: 2 },
    };

    vi.spyOn(feedApi, 'fetchVideoFeed')
      .mockResolvedValueOnce(page1Response)
      .mockResolvedValueOnce(page2Response);

    const { result } = renderHook(() => useInfiniteVideoFeed(10), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.hasNextPage).toBe(true);

    result.current.fetchNextPage();

    await waitFor(() => {
      expect(result.current.data?.pages).toHaveLength(2);
    });

    expect(feedApi.fetchVideoFeed).toHaveBeenNthCalledWith(1, 1, 10);
    expect(feedApi.fetchVideoFeed).toHaveBeenNthCalledWith(2, 2, 10);
    expect(result.current.data?.pages[1]).toEqual(page2Response);
    expect(result.current.hasNextPage).toBe(false);
  });

  it('returns undefined for next page parameter when on the last page', async () => {
    const lastPageResponse: feedApi.VideoFeedResponse = {
      videos: [
        {
          id: 'vid-1',
          title: 'Final Video',
          playbackUrl: '/raw/vid-1.mp4',
          thumbnailUrl: '/thumb/vid-1.jpg',
          createdAt: '2026-03-01T10:00:00Z',
          user: { id: 'usr-1', name: 'John Doe' },
        },
      ],
      pagination: { total: 5, page: 1, limit: 12, totalPages: 1 },
    };

    vi.spyOn(feedApi, 'fetchVideoFeed').mockResolvedValueOnce(lastPageResponse);

    const { result } = renderHook(() => useInfiniteVideoFeed(12), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.hasNextPage).toBe(false);
  });
});