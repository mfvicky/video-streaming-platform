// import { spawn } from 'child_process';
// import path from 'path';
// import fs from 'fs-extra';
// import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';

// const ffmpegBinaryPath = ffmpegInstaller.path || (ffmpegInstaller as any).default?.path;

// export const transcodeToHLS = async (inputPath: string, outputDir: string): Promise<void> => {
//   // Ensure stream variant directories exist before running FFmpeg
//   // COMMENTED OUT FOR LOCAL DEV SPEED: 1080p output folder disabled
//   // await fs.ensureDir(path.join(outputDir, '1080p'));
//   await fs.ensureDir(path.join(outputDir, '720p'));
//   await fs.ensureDir(path.join(outputDir, '480p'));

//   /*
//    * ORIGINAL FILTERGRAPH (1080p, 720p, 480p):
//    * const filterGraph = [
//    *   '[0:v]split=3[v1][v2][v3]',
//    *   '[v1]scale=w=1920:h=1080:force_original_aspect_ratio=decrease,scale=trunc(iw/2)*2:trunc(ih/2)*2[v1out]',
//    *   '[v2]scale=w=1280:h=720:force_original_aspect_ratio=decrease,scale=trunc(iw/2)*2:trunc(ih/2)*2[v2out]',
//    *   '[v3]scale=w=854:h=480:force_original_aspect_ratio=decrease,scale=trunc(iw/2)*2:trunc(ih/2)*2[v3out]'
//    * ].join(';');
//   */

//   // LIGHTWEIGHT FILTERGRAPH (720p & 480p only) FOR LOCAL DEV SPEED
//   const filterGraph = [
//     '[0:v]split=2[v1][v2]',
//     '[v1]scale=w=1280:h=720:force_original_aspect_ratio=decrease,scale=trunc(iw/2)*2:trunc(ih/2)*2[v1out]',
//     '[v2]scale=w=854:h=480:force_original_aspect_ratio=decrease,scale=trunc(iw/2)*2:trunc(ih/2)*2[v2out]'
//   ].join(';');

//   const args = [
//     '-i', inputPath,
//     '-filter_complex', filterGraph,

//     // GLOBAL ENCODING SPEED & PERFORMANCE OPTIMIZATIONS
//     '-preset', 'ultrafast',        // Changed from 'superfast' to 'ultrafast' for maximum CPU speed
//     '-threads', '0',               // OPTIMIZATION: Allows FFmpeg to utilize all available CPU threads aggressively
//     '-r', '30',                    // Caps target frame rate to 30fps
//     '-g', '60',                    // Keyframe every 2 seconds
//     '-sc_threshold', '0',          // Prevents scene-cut keyframes from breaking segment boundaries

//     /*
//      * VARIANT 0 (1080p) - COMMENTED OUT FOR LOCAL DEVELOPMENT:
//      * '-map', '[v1out]', '-map', '0:a?',
//      * '-c:v:0', 'libx264', '-b:v:0', '5000k', '-maxrate:v:0', '5350k', '-bufsize:v:0', '7500k',
//     */

//     // Variant 0 (Now 720p in current active graph)
//     '-map', '[v1out]', '-map', '0:a?',
//     '-c:v:0', 'libx264', '-b:v:0', '2800k', '-maxrate:v:0', '2996k', '-bufsize:v:0', '4200k',

//     // Variant 1 (Now 480p in current active graph)
//     '-map', '[v2out]', '-map', '0:a?',
//     '-c:v:1', 'libx264', '-b:v:1', '1400k', '-maxrate:v:1', '1498k', '-bufsize:v:1', '2100k',

//     // Audio Config
//     '-c:a', 'aac', '-ar', '48000',

//     // HLS Playlist Structure
//     '-f', 'hls',
//     '-hls_time', '6',
//     '-hls_playlist_type', 'vod',
//     '-hls_flags', 'independent_segments',
//     '-hls_segment_filename', path.join(outputDir, '%v', 'segment_%03d.ts'),
//     '-master_pl_name', 'master.m3u8',

//     /*
//      * ORIGINAL VAR_STREAM_MAP (3 Streams):
//      * '-var_stream_map', 'v:0,a:0,agroup:audio v:1,a:1,agroup:audio v:2,a:2,agroup:audio',
//     */
//     // UPDATED VAR_STREAM_MAP (2 Streams for 720p & 480p)
//     '-var_stream_map', 'v:0,a:0,agroup:audio v:1,a:1,agroup:audio',
    
//     path.join(outputDir, '%v', 'manifest.m3u8'),
//   ];

//   return new Promise((resolve, reject) => {
//     const ffmpeg = spawn(ffmpegBinaryPath, args);

//     ffmpeg.stderr.on('data', (data) => {
//       console.log(`[FFmpeg]: ${data.toString()}`);
//     });

//     ffmpeg.on('close', (code) => {
//       if (code === 0) {
//         resolve();
//       } else {
//         reject(new Error(`FFmpeg processing failed with exit code ${code}`));
//       }
//     });

//     ffmpeg.on('error', (err) => {
//       reject(err);
//     });
//   });
// };
// import { spawn } from 'child_process';
// import path from 'path';
// import fs from 'fs-extra';
// import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';

// const ffmpegBinaryPath = ffmpegInstaller.path || (ffmpegInstaller as any).default?.path;

// export const transcodeToHLS = async (inputPath: string, outputDir: string): Promise<void> => {
//   // Ensure default variant output directories ('0' and '1') exist
//   await fs.ensureDir(path.join(outputDir, '0'));
//   await fs.ensureDir(path.join(outputDir, '1'));

//   // Normalize paths to forward slashes for Windows compatibility
//   const hlsSegmentPath = path.resolve(outputDir, '%v', 'segment_%03d.ts').replace(/\\/g, '/');
//   const hlsManifestPath = path.resolve(outputDir, '%v', 'manifest.m3u8').replace(/\\/g, '/');

//   const filterGraph = [
//     '[0:v]split=2[v1][v2]',
//     '[v1]scale=w=1280:h=720:force_original_aspect_ratio=decrease,scale=trunc(iw/2)*2:trunc(ih/2)*2[v1out]',
//     '[v2]scale=w=854:h=480:force_original_aspect_ratio=decrease,scale=trunc(iw/2)*2:trunc(ih/2)*2[v2out]',
//   ].join(';');

//   const args = [
//     '-i',
//     inputPath,
//     '-filter_complex',
//     filterGraph,

//     // Performance Flags
//     '-preset',
//     'ultrafast',
//     '-threads',
//     '0',
//     '-r',
//     '30',
//     '-g',
//     '60',
//     '-sc_threshold',
//     '0',

//     // Variant 0 (720p)
//     '-map',
//     '[v1out]',
//     '-map',
//     '0:a?',
//     '-c:v:0',
//     'libx264',
//     '-b:v:0',
//     '2800k',
//     '-maxrate:v:0',
//     '2996k',
//     '-bufsize:v:0',
//     '4200k',

//     // Variant 1 (480p)
//     '-map',
//     '[v2out]',
//     '-map',
//     '0:a?',
//     '-c:v:1',
//     'libx264',
//     '-b:v:1',
//     '1400k',
//     '-maxrate:v:1',
//     '1498k',
//     '-bufsize:v:1',
//     '2100k',

//     // Audio Config
//     '-c:a',
//     'aac',
//     '-ar',
//     '48000',

//     // HLS Options
//     '-f',
//     'hls',
//     '-hls_time',
//     '6',
//     '-hls_playlist_type',
//     'vod',
//     '-hls_flags',
//     'independent_segments',
//     '-hls_segment_filename',
//     hlsSegmentPath,
//     '-master_pl_name',
//     'master.m3u8',

//     // STANDARD STREAM MAP (No 'name:' tag)
//     '-var_stream_map',
//     'v:0,a:0,agroup:audio v:1,a:1,agroup:audio',

//     hlsManifestPath,
//   ];

//   return new Promise((resolve, reject) => {
//     const ffmpeg = spawn(ffmpegBinaryPath, args);

//     ffmpeg.stderr.on('data', (data) => {
//       console.log(`[FFmpeg]: ${data.toString()}`);
//     });

//     ffmpeg.on('close', (code) => {
//       if (code === 0) {
//         resolve();
//       } else {
//         reject(new Error(`FFmpeg processing failed with exit code ${code}`));
//       }
//     });

//     ffmpeg.on('error', (err) => {
//       reject(err);
//     });
//   });
// };
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs-extra';

// Use system FFmpeg directly or fallback to bundled installer
let ffmpegBinaryPath = 'ffmpeg';
try {
  const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
  ffmpegBinaryPath = ffmpegInstaller.path || ffmpegInstaller.default?.path || 'ffmpeg';
} catch {
  ffmpegBinaryPath = 'ffmpeg';
}

export const transcodeToHLS = async (inputPath: string, outputDir: string): Promise<void> => {
  // Ensure default variant output directories ('0' and '1') exist
  await fs.ensureDir(path.join(outputDir, '0'));
  await fs.ensureDir(path.join(outputDir, '1'));

  // Define manifest location and relative segment pattern
  const masterManifestPath = path.resolve(outputDir, 'master.m3u8').replace(/\\/g, '/');
  const hlsSegmentPath = '%v/segment_%03d.ts';
  const hlsVariantManifestPath = '%v/manifest.m3u8';

  // Explicitly split both video AND audio inside filter graph
  const filterGraph = [
    '[0:v]split=2[v1][v2]',
    '[v1]scale=w=1280:h=720:force_original_aspect_ratio=decrease,scale=trunc(iw/2)*2:trunc(ih/2)*2[v1out]',
    '[v2]scale=w=854:h=480:force_original_aspect_ratio=decrease,scale=trunc(iw/2)*2:trunc(ih/2)*2[v2out]',
    '[0:a]asplit=2[a1out][a2out]'
  ].join(';');

  const args = [
    '-i', inputPath,
    '-filter_complex', filterGraph,

    // Performance Flags
    '-preset', 'ultrafast',
    '-threads', '0',
    '-r', '30',
    '-g', '60',
    '-sc_threshold', '0',

    // Variant 0 (720p)
    '-map', '[v1out]',
    '-map', '[a1out]',
    '-c:v:0', 'libx264',
    '-b:v:0', '2800k',
    '-maxrate:v:0', '2996k',
    '-bufsize:v:0', '4200k',

    // Variant 1 (480p)
    '-map', '[v2out]',
    '-map', '[a2out]',
    '-c:v:1', 'libx264',
    '-b:v:1', '1400k',
    '-maxrate:v:1', '1498k',
    '-bufsize:v:1', '2100k',

    // Global Audio Encoding Config
    '-c:a', 'aac',
    '-ar', '48000',
    '-b:a', '128k',

    // HLS Multiplexer Settings
    '-f', 'hls',
    '-hls_time', '6',
    '-hls_playlist_type', 'vod',
    '-hls_flags', 'independent_segments+temp_file',
    '-hls_segment_filename', hlsSegmentPath,
    '-master_pl_name', 'master.m3u8',
    '-var_stream_map', 'v:0,a:0 v:1,a:1',

    // Execute working directory relative to output target
    hlsVariantManifestPath
  ];

  return new Promise((resolve, reject) => {
    const ffmpeg = spawn(ffmpegBinaryPath, args, { cwd: outputDir });

    ffmpeg.stderr.on('data', (data) => {
      console.log(`[FFmpeg]: ${data.toString()}`);
    });

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`FFmpeg processing failed with exit code ${code}`));
      }
    });

    ffmpeg.on('error', (err) => {
      reject(err);
    });
  });
};