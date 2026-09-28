import { apiClient } from '../../../lib/axios';

export const uploadCreatorVideo = async (formData: FormData) => {
  // Omit explicit headers so the browser sets multipart/form-data; boundary=...
  const response = await apiClient.post('/video/upload', formData);
  return response.data;
};

export const getVideoStreamUrl = async (videoId: string) => {
  const response = await apiClient.get(`/video/stream/${videoId}`);
  return response.data;
};