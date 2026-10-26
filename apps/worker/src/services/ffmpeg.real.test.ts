/** Actual FFmpeg process test. No child_process mocks.
 * Run with RUN_REAL_FFMPEG=1 pnpm --filter worker exec vitest run src/services/ffmpeg.real.test.ts
 * Uses the installer binary, or FFMPEG_PATH, and works on Windows and Linux.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import fs from 'node:fs/promises';
import path from 'node:path';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import { extractThumbnail, transcodeToHLS } from './ffmpeg.service';

const binary = process.env.FFMPEG_PATH || ffmpegInstaller.path;
const canRun = spawnSync(binary, ['-version'], { encoding: 'utf8' }).status === 0;
const enabled = process.env.RUN_REAL_FFMPEG === '1' && canRun;
const tmpDirs: string[] = [];
afterEach(async () => {
  await Promise.all(tmpDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

async function fixture(hasAudio: boolean) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'streamverse-real-ffmpeg-'));
  tmpDirs.push(dir);
  const input = path.join(dir, hasAudio ? 'audio.mp4' : 'silent.mp4');
  const args = ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i', 'testsrc2=size=1920x1080:rate=15'];
  if (hasAudio) args.push('-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=44100');
  args.push('-t', '1', '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p');
  if (hasAudio) args.push('-c:a', 'aac', '-shortest');
  else args.push('-an');
  args.push(input);
  const generated = spawnSync(binary, args, { encoding: 'utf8', timeout: 60_000 });
  if (generated.status !== 0) throw new Error(`FFmpeg fixture failed: ${generated.stderr}`);
  return { dir, input };
}

const metadata = (hasAudio: boolean) => ({
  width: 1920, height: 1080, durationSeconds: 1, fileSizeBytes: 4096,
  videoCodec: 'h264', bitrate: null, audioChannels: hasAudio ? 1 : null, hasAudio,
});

describe.skipIf(!enabled)('real FFmpeg/HLS compatibility', () => {
  for (const hasAudio of [true, false]) {
    it(`generates playable HLS renditions with ${hasAudio ? 'single' : 'no'} audio track`, async () => {
      const { dir, input } = await fixture(hasAudio);
      const output = path.join(dir, 'hls');
      await fs.mkdir(output);
      const thumbnail = path.join(dir, 'thumbnail.jpg');
      await extractThumbnail(input, thumbnail);
      expect((await fs.stat(thumbnail)).size).toBeGreaterThan(0);
      const master = await transcodeToHLS(input, output, metadata(hasAudio));
      const playlist = await fs.readFile(master, 'utf8');
      expect((playlist.match(/#EXT-X-STREAM-INF/g) ?? [])).toHaveLength(3);
      for (let i = 0; i < 3; i++) {
        expect(playlist).toContain(`${i}/manifest.m3u8`);
        const leaf = await fs.readFile(path.join(output, String(i), 'manifest.m3u8'), 'utf8');
        expect(leaf).toContain('#EXT-X-ENDLIST');
        const tsSegments = (await fs.readdir(path.join(output, String(i))))
          .filter((name) => name.endsWith('.ts'));
        expect(tsSegments.length).toBeGreaterThan(0);
        expect((await fs.stat(path.join(output, String(i), tsSegments[0]))).size).toBeGreaterThan(0);
      }
    }, 120_000);
  }
});
