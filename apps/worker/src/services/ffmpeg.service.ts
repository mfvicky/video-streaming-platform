import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'fs-extra';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import type { VideoMetadata } from './ffprobe.service';
import { selectHlsVariants } from './hls-profiles';
export { selectHlsVariants } from './hls-profiles';

const ffmpegBinaryPath =
  process.env.FFMPEG_PATH || ffmpegInstaller.path || 'ffmpeg';

async function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegBinaryPath, args);
    let lastError = '';
    proc.stderr.on('data', (data: Buffer) => {
      lastError = (lastError + data.toString()).slice(-4000);
    });
    proc.once('error', reject);
    proc.once('close', (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`FFmpeg exited with ${code}: ${lastError}`)),
    );
  });
}

export const extractThumbnail = async (
  inputPath: string,
  outputPath: string,
): Promise<string> => {
  await runFfmpeg([
    '-hide_banner',
    '-loglevel',
    'error',
    '-y',
    '-ss',
    '0.5',
    '-i',
    path.resolve(inputPath),
    '-frames:v',
    '1',
    '-q:v',
    '2',
    path.resolve(outputPath),
  ]);
  return outputPath;
};

export const transcodeToHLS = async (
  inputPath: string,
  outputDir: string,
  metadata: VideoMetadata,
  onProgress?: (percent: number) => Promise<void>,
): Promise<string> => {
  // The profile selector already caps renditions at source resolution.
  // Keep the 1080p variant when the original video supports it.
  const variants = selectHlsVariants(metadata);

  for (const [index, variant] of variants.entries()) {
    const folder = path.resolve(outputDir, String(variant.index));
    await fs.ensureDir(folder);
    await runFfmpeg([
      '-hide_banner',
      '-loglevel',
      'error',
      '-y',
      '-i',
      path.resolve(inputPath),
      '-map',
      '0:v:0',
      '-map',
      '0:a:0?',
      '-vf',
      `scale=${variant.width}:${variant.height}:flags=lanczos,setsar=1`,
      '-c:v',
      'libx264',
      '-preset',
      'veryfast',
      '-pix_fmt',
      'yuv420p',
      '-b:v',
      variant.bitrate,
      '-g',
      '60',
      '-sc_threshold',
      '0',
      '-c:a',
      'aac',
      '-b:a',
      '128k',
      '-ar',
      '48000',
      '-f',
      'hls',
      '-hls_time',
      '2',
      '-hls_playlist_type',
      'vod',
      '-hls_flags',
      'independent_segments',
      '-hls_segment_filename',
      path.join(folder, 'segment_%03d.ts'),
      path.join(folder, 'manifest.m3u8'),
    ]);
    await onProgress?.(Math.round(((index + 1) / variants.length) * 100));
  }
  const manifest = [
    '#EXTM3U',
    '#EXT-X-VERSION:3',
    ...variants.flatMap((v) => [
      `#EXT-X-STREAM-INF:BANDWIDTH=${v.bandwidth},RESOLUTION=${v.width}x${v.height}`,
      `${v.index}/manifest.m3u8`,
    ]),
    '',
  ].join('\n');
  const master = path.join(outputDir, 'master.m3u8');
  await fs.writeFile(master, manifest, 'utf8');
  return master;
};
