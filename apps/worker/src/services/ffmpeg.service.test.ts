import { describe, it, expect, vi, beforeEach } from 'vitest';
import { spawn } from 'node:child_process';
import fs from 'fs-extra';
import path from 'path';
import EventEmitter from 'events';

vi.mock('node:child_process', () => ({ spawn: vi.fn() }));
vi.mock('fs-extra', () => ({
  default: {
    ensureDir: vi.fn().mockResolvedValue(undefined),
    writeFile: vi.fn().mockResolvedValue(undefined),
  },
}));
vi.mock('@ffmpeg-installer/ffmpeg', () => ({
  default: { path: '/test/ffmpeg' },
}));
import {
  extractThumbnail,
  transcodeToHLS,
  selectHlsVariants,
} from './ffmpeg.service';

function succeedImmediately() {
  vi.mocked(spawn).mockImplementation(() => {
    const proc = new EventEmitter() as any;
    proc.stderr = new EventEmitter();
    queueMicrotask(() => proc.emit('close', 0));
    return proc;
  });
}

describe('FFmpeg media pipeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.FFMPEG_PATH;
  });
  it('extracts a thumbnail without buffering the source', async () => {
    succeedImmediately();
    const output = await extractThumbnail('source.mp4', 'thumbnail.jpg');
    expect(output).toBe('thumbnail.jpg');
    expect(spawn).toHaveBeenCalledWith(
      '/test/ffmpeg',
      expect.arrayContaining(['-ss', '0.5', '-i', path.resolve('source.mp4')]),
    );
  });
  it('makes three variants for 1080p input, independently maps optional audio, and creates a master', async () => {
    succeedImmediately();
    const output = await transcodeToHLS('source.mp4', 'hls-output', {
      width: 1920,
      height: 1080,
      durationSeconds: 4,
      videoCodec: 'h264',
      fileSizeBytes: 1024,
      bitrate: null,
      audioChannels: 2,
      hasAudio: true,
    });
    expect(output).toBe(path.join('hls-output', 'master.m3u8'));
    expect(spawn).toHaveBeenCalledTimes(3);
    for (const invocation of vi.mocked(spawn).mock.calls) {
      const args = invocation[1] as string[];
      expect(args).toEqual(
        expect.arrayContaining(['-map', '0:v:0', '-map', '0:a:0?']),
      );
      expect(args).not.toContain('-var_stream_map');
      expect(args).toContain('-hls_segment_filename');
    }
    expect(fs.writeFile).toHaveBeenCalledWith(
      output,
      expect.stringContaining('0/manifest.m3u8'),
      'utf8',
    );
    expect(fs.writeFile).toHaveBeenCalledWith(
      output,
      expect.stringContaining('1/manifest.m3u8'),
      'utf8',
    );
    expect(fs.writeFile).toHaveBeenCalledWith(
      output,
      expect.stringContaining('2/manifest.m3u8'),
      'utf8',
    );
  });
  it('caps variants without ever upscaling 360p, 720p or portrait sources', () => {
    expect(selectHlsVariants({ width: 640, height: 360 })).toHaveLength(1);
    expect(selectHlsVariants({ width: 1280, height: 720 })).toHaveLength(2);
    expect(selectHlsVariants({ width: 1920, height: 1080 })).toHaveLength(3);
    for (const source of [
      { width: 640, height: 360 },
      { width: 1280, height: 720 },
      { width: 1080, height: 1920 },
    ]) {
      for (const variant of selectHlsVariants(source)) {
        expect(variant.width).toBeLessThanOrEqual(source.width);
        expect(variant.height).toBeLessThanOrEqual(source.height);
      }
    }
  });
  it('preserves native quality for ultrawide 1280x544 and does not invent 720p height', () => {
    const variants = selectHlsVariants({ width: 1280, height: 544 });
    expect(variants.map(({ width, height }) => [width, height])).toEqual([
      [1280, 544],
      [854, 362],
    ]);
    expect(variants.map((v) => v.label)).toEqual(['544p', '362p']);
    expect(variants.every((v) => v.width <= 1280 && v.height <= 544)).toBe(
      true,
    );
  });
  it('surfaces failed FFmpeg exit code', async () => {
    vi.mocked(spawn).mockImplementation(() => {
      const proc = new EventEmitter() as any;
      proc.stderr = new EventEmitter();
      queueMicrotask(() => proc.emit('close', 1));
      return proc;
    });
    await expect(
      transcodeToHLS('source.mp4', 'hls-output', {
        width: 1920,
        height: 1080,
        durationSeconds: 4,
        videoCodec: 'h264',
        fileSizeBytes: 1024,
        bitrate: null,
        audioChannels: 2,
        hasAudio: true,
      }),
    ).rejects.toThrow('FFmpeg exited with 1');
  });
});
