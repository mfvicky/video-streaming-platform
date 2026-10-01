import { apiClient } from '../../../lib/axios';
export interface CreatorVideo {
  id: string;
  title: string;
  status: 'PENDING' | 'PROCESSING' | 'READY' | 'FAILED';
  rawPath: string;
  thumbnailPath: string | null;
  createdAt: string;
  updatedAt: string;
}

export const uploadCreatorVideo = async (formData: FormData) => {
  // Omit explicit headers so the browser sets multipart/form-data; boundary=...
  const response = await apiClient.post('/video/upload', formData);
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

export const getMyVideos = async (): Promise<CreatorVideo[]> => {
  const response = await apiClient.get(`/video/creator`);
  return response.data.videos;
};

export const retryVideoProcessingApi = async (videoId: string) => {
  const response = await apiClient.post(`/video/retry/${videoId}`);
  return response.data;
};

export const deleteVideoApi = async (videoId: string) => {
  const response = await apiClient.delete(`/video/${videoId}`);
  return response.data;
};