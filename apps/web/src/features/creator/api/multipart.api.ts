import { apiClient } from '../../../lib/axios';

// S3 multipart uploads through authenticated API endpoints. The API streams
// each bounded chunk into private MinIO; the browser never receives S3 secrets.
export const PART_SIZE = 8 * 1024 * 1024;
export const MAX_FILE_BYTES = 2_147_483_647;

interface Part {
  partNumber: number;
  size: number;
  etag: string;
}
interface Session {
  sessionId: string;
  videoId: string;
  fileSize: number;
  partSize: number;
  status: string;
  parts: Part[];
}

async function fingerprint(file: File): Promise<string> {
  // Hash first/last MiB to avoid accidentally resuming against another file
  // with the same name, size and modification timestamp.
  const first = await file.slice(0, 1024 * 1024).arrayBuffer();
  const last = await file
    .slice(Math.max(0, file.size - 1024 * 1024))
    .arrayBuffer();
  const prefix = new TextEncoder().encode(
    `${file.name}:${file.size}:${file.lastModified}:`,
  );
  const bytes = new Uint8Array(
    prefix.length + first.byteLength + last.byteLength,
  );
  bytes.set(prefix, 0);
  bytes.set(new Uint8Array(first), prefix.length);
  bytes.set(new Uint8Array(last), prefix.length + first.byteLength);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function userScope() {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}') as {
      id?: string;
    };
    return user.id || 'current-account';
  } catch {
    return 'current-account';
  }
}

export async function uploadResumableVideo(
  file: File,
  title: string,
  options: { onProgress: (percent: number) => void; signal?: AbortSignal },
): Promise<{ videoId: string }> {
  if (file.size < 1 || file.size > MAX_FILE_BYTES)
    throw new Error('Video must be smaller than 2 GiB');
  const key = `streamverse:multipart:${userScope()}:${await fingerprint(file)}`;
  let sessionId = localStorage.getItem(key);
  let session: Session | undefined;

  if (sessionId) {
    try {
      const response = await apiClient.get<{ data: Session }>(
        `/video/upload-sessions/${sessionId}`,
        { signal: options.signal },
      );
      session = response.data.data;
      if (session.fileSize !== file.size || session.partSize !== PART_SIZE)
        throw new Error('Upload definition changed');
      if (session.status === 'COMPLETED') {
        localStorage.removeItem(key);
        return { videoId: session.videoId };
      }
      if (session.status === 'FINALIZING') {
        // The previous connection might have disappeared while S3 was completing.
        // The server serializes completion and permits a stale finalization to retry.
        const response = await apiClient.post<{ data: { videoId: string } }>(
          `/video/upload-sessions/${sessionId}/complete`,
          {},
          { signal: options.signal },
        );
        localStorage.removeItem(key);
        options.onProgress(100);
        return response.data.data;
      }
      if (session.status !== 'OPEN') throw new Error('Upload is not resumable');
    } catch (error: unknown) {
      const status =
        error && typeof error === 'object' && 'response' in error
          ? (error as { response?: { status?: number } }).response?.status
          : undefined;
      // Sessions can expire or be deleted. Do not overwrite an active session on transient errors.
      if (status !== 404 && status !== 410) throw error;
      localStorage.removeItem(key);
      sessionId = null;
    }
  }
  if (!session) {
    const { data } = await apiClient.post<{ data: Session }>(
      '/video/upload-sessions',
      {
        title,
        fileName: file.name,
        fileSize: file.size,
        contentType: file.type || 'application/octet-stream',
      },
      { signal: options.signal },
    );
    session = data.data;
    sessionId = session.sessionId;
    localStorage.setItem(key, sessionId);
  }

  const parts = new Map(session.parts.map((p) => [p.partNumber, p]));
  const totalParts = Math.ceil(file.size / PART_SIZE);
  let confirmed = [...parts.values()].reduce((sum, p) => sum + p.size, 0);
  options.onProgress(Math.min(99, Math.round((confirmed / file.size) * 100)));

  for (let number = 1; number <= totalParts; number++) {
    if (options.signal?.aborted)
      throw new DOMException('Upload paused', 'AbortError');
    if (parts.has(number)) continue;
    const start = (number - 1) * PART_SIZE;
    const chunk = file.slice(start, Math.min(file.size, start + PART_SIZE));
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await apiClient.put(
          `/video/upload-sessions/${sessionId}/parts/${number}`,
          chunk,
          {
            headers: { 'Content-Type': 'application/octet-stream' },
            signal: options.signal,
            onUploadProgress: (event) => {
              options.onProgress(
                Math.min(
                  99,
                  Math.round(
                    ((confirmed + Math.min(chunk.size, event.loaded)) /
                      file.size) *
                      100,
                  ),
                ),
              );
            },
          },
        );
        confirmed += chunk.size;
        options.onProgress(
          Math.min(99, Math.round((confirmed / file.size) * 100)),
        );
        break;
      } catch (error) {
        if (options.signal?.aborted || attempt === 3) throw error;
        await new Promise((resolve) =>
          setTimeout(resolve, 500 * 2 ** (attempt - 1)),
        );
        // A timed-out request may have completed on the server; a repeated PUT
        // safely replaces the same S3 part number.
      }
    }
  }

  const { data: completed } = await apiClient.post<{
    data: { videoId: string };
  }>(
    `/video/upload-sessions/${sessionId}/complete`,
    {},
    { signal: options.signal },
  );
  localStorage.removeItem(key);
  options.onProgress(100);
  return completed.data;
}
