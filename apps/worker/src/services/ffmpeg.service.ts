import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs-extra';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';

// The Docker worker installs FFmpeg from apk; local macOS/Windows may use the bundled binary.
const ffmpegBinaryPath =
  process.env.FFMPEG_PATH || ffmpegInstaller.path || 'ffmpeg';

async function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const process = spawn(ffmpegBinaryPath, args);
    let lastError = '';
    process.stderr.on('data', (data: Buffer) => {
      lastError = (lastError + data.toString()).slice(-4000);
    });
    process.on('error', reject);
    process.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`FFmpeg exited with ${code}: ${lastError}`));
    });
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

/**
 * Make two self-contained HLS renditions. Each independent muxer maps the
 * *first* audio stream if it exists; no second audio track is ever required.
 * `0:a:0?` also allows silent video files.
 *
 * Separate output files avoid `-var_stream_map` mismatches and accidental
 * audio stream reuse, which would make all renditions fail together.
 */
export const transcodeToHLS = async (
  inputPath: string,
  outputDir: string,
): Promise<string> => {
  const source = path.resolve(inputPath);
  const variants = [
    {
      index: 0,
      width: 1280,
      height: 720,
      bitrate: '2800k',
      bandwidth: 2800000,
    },
    { index: 1, width: 854, height: 480, bitrate: '1400k', bandwidth: 1400000 },
  ];
  for (const variant of variants) {
    const folder = path.resolve(outputDir, String(variant.index));
    await fs.ensureDir(folder);
    await runFfmpeg([
      '-hide_banner',
      '-loglevel',
      'error',
      '-y',
      '-i',
      source,
      '-map',
      '0:v:0',
      '-map',
      '0:a:0?',
      '-vf',
      `scale=${variant.width}:${variant.height}:force_original_aspect_ratio=decrease:force_divisible_by=2`,
      '-c:v',
      'libx264',
      '-preset',
      'ultrafast',
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
