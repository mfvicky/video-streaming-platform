import { spawn } from 'node:child_process';
import { stat } from 'node:fs/promises';

export interface VideoMetadata {
  durationSeconds: number | null;
  width: number;
  height: number;
  videoCodec: string | null;
  fileSizeBytes: number;
  bitrate: number | null;
  audioChannels: number | null;
  hasAudio: boolean;
}

/** FFprobe is installed in the Docker worker via apk; local dev needs ffprobe in PATH. */
export async function probeVideo(inputPath: string): Promise<VideoMetadata> {
  const executable = process.env.FFPROBE_PATH || 'ffprobe';
  const output = await new Promise<string>((resolve, reject) => {
    const proc = spawn(executable, [
      '-v',
      'error',
      '-print_format',
      'json',
      '-show_format',
      '-show_streams',
      inputPath,
    ]);
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (data: Buffer) => {
      stdout += data.toString();
    });
    proc.stderr.on('data', (data: Buffer) => {
      stderr = (stderr + data.toString()).slice(-4000);
    });
    proc.once('error', reject);
    proc.once('close', (code) =>
      code === 0
        ? resolve(stdout)
        : reject(new Error(`FFprobe exited ${code}: ${stderr}`)),
    );
  });
  const probe = JSON.parse(output) as {
    streams?: Array<{
      codec_type?: string;
      codec_name?: string;
      width?: number;
      height?: number;
      channels?: number;
      duration?: string;
      bit_rate?: string;
    }>;
    format?: { duration?: string; bit_rate?: string };
  };
  const video = probe.streams?.find((stream) => stream.codec_type === 'video');
  if (!video?.width || !video.height)
    throw new Error('No valid video stream found');
  const audio = probe.streams?.find((stream) => stream.codec_type === 'audio');
  const numeric = (value?: string): number | null => {
    const n = Number(value);
    return value && Number.isFinite(n) && n >= 0 ? n : null;
  };
  const stats = await stat(inputPath);
  // Multer limits inputs to 1 GiB; Int is safe in the Prisma model.
  if (stats.size > 2_147_483_647)
    throw new Error('Source file exceeds metadata storage limit');
  return {
    durationSeconds: numeric(probe.format?.duration) ?? numeric(video.duration),
    width: video.width,
    height: video.height,
    videoCodec: video.codec_name ?? null,
    fileSizeBytes: stats.size,
    bitrate: numeric(probe.format?.bit_rate),
    audioChannels: audio?.channels ?? null,
    hasAudio: Boolean(audio),
  };
}
