import { useInfiniteQuery } from '@tanstack/react-query';
import { fetchVideoFeed, type VideoFeedResponse } from '../api/feed.api';

export const useInfiniteVideoFeed = (limit = 12) => {
  return useInfiniteQuery<VideoFeedResponse, Error>({
    queryKey: ['videoFeed', 'infinite', limit],
    queryFn: ({ pageParam = 1 }) => fetchVideoFeed(pageParam as number, limit),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage.pagination;
      return page < totalPages ? page + 1 : undefined;
    },
    staleTime: 1000 * 60 * 2,
  });
};