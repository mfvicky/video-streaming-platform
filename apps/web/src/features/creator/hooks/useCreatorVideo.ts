import { useMutation, useQuery } from '@tanstack/react-query';
import { uploadCreatorVideo, getVideoStreamUrl, getVideoThumbnailUrl } from '../api/creator.api';

// Mutation hook for handling video upload
export const useUploadVideo = () => {
  return useMutation({
    mutationFn: (formData: FormData) => uploadCreatorVideo(formData),
  });
};

// Query hook for fetching HLS stream URL with auto-refetching/polling while processing
export const useVideoStream = (videoId: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['videoStream', videoId],
    queryFn: () => getVideoStreamUrl(videoId),
    enabled: Boolean(videoId) && enabled,
    // Poll every 5 seconds if stream is not ready yet
    refetchInterval: (query) => {
      if (query.state.data?.success) {
        return false; // Stop polling when stream URL is ready
      }
      return 5000;
    },
    retry: false,
  });
};

// Query hook for fetching thumbnail URL
export const useVideoThumbnail = (videoId: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['videoThumbnail', videoId],
    queryFn: () => getVideoThumbnailUrl(videoId),
    enabled: Boolean(videoId) && enabled,
    retry: false,
  });
};