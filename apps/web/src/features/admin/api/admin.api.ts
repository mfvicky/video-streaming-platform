import { apiClient } from '../../../lib/axios';
import type { VideoFilters } from '../../creator/api/creator.api';

export interface AdminMetrics {
  totalVideos: number;
  counts: Record<'PENDING' | 'PROCESSING' | 'READY' | 'FAILED', number>;
  originalBytes: number;
  storedBytes: number | null;
  totalViews: number;
  totalDownloads: number;
  averageProcessingSeconds: number;
  queues: Record<string, number | null>;
}
export interface AdminVideo {
  id: string;
  title: string;
  status: 'PENDING' | 'PROCESSING' | 'READY' | 'FAILED';
  createdAt: string;
  width: number | null;
  height: number | null;
  durationSeconds: number | null;
  fileSizeBytes: number | null;
  viewCount: number;
  downloadCount: number;
  processingAttempts: number;
  processingError: string | null;
  creator: { id: string; name: string | null; email: string };
}
export async function fetchAdminMetrics(): Promise<AdminMetrics> {
  const response = await apiClient.get('/admin/metrics');
  return response.data.data;
}
export async function fetchAdminVideos(
  filters: VideoFilters,
  page = 1,
): Promise<{
  data: AdminVideo[];
  pagination: { total: number; totalPages: number };
}> {
  const response = await apiClient.get('/admin/videos', {
    params: { ...filters, page, limit: 20 },
  });
  return response.data;
}
export async function adminRetryVideo(id: string): Promise<void> {
  await apiClient.post(`/admin/videos/${encodeURIComponent(id)}/retry`);
}
