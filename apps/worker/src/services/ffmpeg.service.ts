import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs-extra';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';

const ffmpegBinaryPath = ffmpegInstaller.path || (ffmpegInstaller as any).default?.path;

/**
 * Manually builds the HLS master playlist file once variant streams are processed.
 */
const createMasterPlaylist = async (outputDir: string): Promise<string> => {
  const masterContent = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-STREAM-INF:BANDWIDTH=2800000,RESOLUTION=1280x720
0/manifest.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=1400000,RESOLUTION=854x480
1/manifest.m3u8
`;

  const masterPath = path.join(outputDir, 'master.m3u8');
  await fs.writeFile(masterPath, masterContent, 'utf-8');
  return masterPath.replace(/\\/g, '/');
};

/**
 * Extracts a thumbnail image frame from the raw video file at 00:00:01
 */
export const extractThumbnail = async (inputPath: string, outputPath: string): Promise<string> => {
  const cleanInputPath = path.resolve(inputPath).replace(/\\/g, '/');
  const cleanOutputPath = path.resolve(outputPath).replace(/\\/g, '/');

  const args = [
    '-y',
    '-ss', '00:00:01',
    '-i', cleanInputPath,
    '-vframes', '1',
    '-q:v', '2',
    cleanOutputPath,
  ];

  return new Promise((resolve, reject) => {
    const ffmpeg = spawn(ffmpegBinaryPath, args);

    ffmpeg.stderr.on('data', (data) => {
      console.log(`[FFmpeg Thumbnail]: ${data.toString()}`);
    });

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        resolve(cleanOutputPath);
      } else {
        reject(new Error(`FFmpeg thumbnail extraction failed with exit code ${code}`));
      }
    });

    ffmpeg.on('error', (err) => reject(err));
  });
};

export const transcodeToHLS = async (inputPath: string, outputDir: string): Promise<string> => {
  // 1. Ensure subdirectories exist
  await fs.ensureDir(path.join(outputDir, '0'));
  await fs.ensureDir(path.join(outputDir, '1'));

  // 2. Format paths for Windows FFmpeg execution
  const cleanOutputDir = outputDir.replace(/\\/g, '/');
  const cleanInputPath = path.resolve(inputPath).replace(/\\/g, '/');

  const hlsSegmentPath = `${cleanOutputDir}/%v/segment_%03d.ts`;
  const hlsManifestPath = `${cleanOutputDir}/%v/manifest.m3u8`;

  const filterGraph = [
    '[0:v]split=2[v1][v2]',
    '[v1]scale=w=1280:h=720:force_original_aspect_ratio=decrease,scale=trunc(iw/2)*2:trunc(ih/2)*2[v1out]',
    '[v2]scale=w=854:h=480:force_original_aspect_ratio=decrease,scale=trunc(iw/2)*2:trunc(ih/2)*2[v2out]',
  ].join(';');

  const args = [
    '-y',
    '-i',
    cleanInputPath,
    '-filter_complex',
    filterGraph,

    // Performance Flags
    '-preset',
    'ultrafast',
    '-threads',
    '0',
    '-r',
    '30',
    '-g',
    '60',
    '-sc_threshold',
    '0',

    // Variant 0 (720p)
    '-map',
    '[v1out]',
    '-map',
    '0:a:0?',
    '-c:v:0',
    'libx264',
    '-b:v:0',
    '2800k',
    '-maxrate:v:0',
    '2996k',
    '-bufsize:v:0',
    '4200k',

    // Variant 1 (480p)
    '-map',
    '[v2out]',
    '-map',
    '0:a:0?',
    '-c:v:1',
    'libx264',
    '-b:v:1',
    '1400k',
    '-maxrate:v:1',
    '1498k',
    '-bufsize:v:1',
    '2100k',

    // Audio Config
    '-c:a',
    'aac',
    '-ar',
    '48000',

    // HLS Options
    '-f',
    'hls',
    '-hls_time',
    '6',
    '-hls_playlist_type',
    'vod',
    '-hls_flags',
    'independent_segments',
    '-hls_segment_filename',
    hlsSegmentPath,

    // Variant Stream Mapping
    '-var_stream_map',
    'v:0,a:0 v:1,a:1',

    hlsManifestPath,
  ];

  return new Promise((resolve, reject) => {
    const ffmpeg = spawn(ffmpegBinaryPath, args);

    ffmpeg.stderr.on('data', (data) => {
      console.log(`[FFmpeg]: ${data.toString()}`);
    });

    ffmpeg.on('close', async (code) => {
      if (code === 0) {
        try {
          // Generate the master playlist cleanly with Node.js
          const masterPlaylistPath = await createMasterPlaylist(outputDir);

          console.log('\n==================================================');
          console.log(' Transcoding completed successfully!');
          console.log(` Master Playlist Path: ${masterPlaylistPath}`);
          console.log('==================================================\n');

          resolve(masterPlaylistPath);
        } catch (fsErr) {
          reject(fsErr);
        }
      } else {
        reject(new Error(`FFmpeg processing failed with exit code ${code}`));
      }
    });

    ffmpeg.on('error', (err) => {
      reject(err);
    });
  });
};