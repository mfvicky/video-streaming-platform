import { apiClient } from '../../../lib/axios';
import { v4 as uuidv4 } from 'uuid';
export interface CreatorVideo {
  id: string;
  title: string;
  status: 'PENDING' | 'PROCESSING' | 'READY' | 'FAILED';
  rawPath: string;
  thumbnailPath: string | null;
  createdAt: string;
  updatedAt: string;
  durationSeconds?: number | null;
  width?: number | null;
  height?: number | null;
  videoCodec?: string | null;
  fileSizeBytes?: number | null;
  processingError?: string | null;
  processingLeaseUntil?: string | null;
  viewCount?: number;
  downloadCount?: number;
  progress?: {
    status: string;
    percent: number;
    stage: string;
    attempt: number;
  } | null;
}

export const uploadCreatorVideo = async (
  formData: FormData,
  onProgress?: (percent: number) => void,
) => {
  // XHR / axios sends onUploadProgress per file, without reading the file into JS memory.
  const config = onProgress
    ? {
        onUploadProgress: (event: { loaded: number; total?: number }) => {
          if (event.total)
            onProgress(
              Math.min(100, Math.round((event.loaded / event.total) * 100)),
            );
        },
      }
    : undefined;
  const response = config
    ? await apiClient.post('/video/upload', formData, config)
    : await apiClient.post('/video/upload', formData);
  return response.data;
};

export const getVideoStreamUrl = async (videoId: string) => {
  const response = await apiClient.get(`/video/stream/${videoId}`);
  return response.data;
};

export const getVideoThumbnailUrl = async (videoId: string) => {
  const response = await apiClient.get(`/video/thumbnail/${videoId}`);
  return response.data;
};

export interface VideoFilters {
  search?: string;
  status?: string;
  resolution?: string;
  from?: string;
  to?: string;
  minDuration?: string;
  maxDuration?: string;
}
export const getMyVideos = async (
  filters?: VideoFilters,
): Promise<CreatorVideo[]> => {
  const response = filters
    ? await apiClient.get('/video/creator', { params: filters })
    : await apiClient.get('/video/creator');
  return response.data.videos;
};

export const getOriginalDownloadTicket = async (
  videoId: string,
): Promise<string> => {
  const response = await apiClient.post(
    `/video/${encodeURIComponent(videoId)}/download-ticket`,
  );
  return response.data.url;
};

export const recordVideoView = async (videoId: string): Promise<void> => {
  // One ID per tab (not a user identifier); Redis de-duplicates repeated play events.
  let sessionId = sessionStorage.getItem('streamverse:viewSession');
  if (!sessionId) {
    sessionId = uuidv4();
    sessionStorage.setItem('streamverse:viewSession', sessionId);
  }
  await apiClient.post(`/video/${encodeURIComponent(videoId)}/view`, {
    sessionId,
  });
};

export const retryVideoProcessingApi = async (videoId: string) => {
  const response = await apiClient.post(`/video/retry/${videoId}`);
  return response.data;
};

export const resumeVideoProcessingApi = async (videoId: string) => {
  const response = await apiClient.post(
    `/video/resume/${encodeURIComponent(videoId)}`,
  );
  return response.data;
};

export const deleteVideoApi = async (videoId: string) => {
  const response = await apiClient.delete(`/video/${videoId}`);
  return response.data;
};
