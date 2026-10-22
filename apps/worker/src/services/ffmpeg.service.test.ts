import { describe, it, expect, vi, beforeEach } from 'vitest';
import { spawn } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import EventEmitter from 'events';

vi.mock('child_process', () => ({ spawn: vi.fn() }));
vi.mock('fs-extra', () => ({
  default: {
    ensureDir: vi.fn().mockResolvedValue(undefined),
    writeFile: vi.fn().mockResolvedValue(undefined),
  },
}));
vi.mock('@ffmpeg-installer/ffmpeg', () => ({
  default: { path: '/test/ffmpeg' },
}));
import { extractThumbnail, transcodeToHLS } from './ffmpeg.service';

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
  it('makes two variants, independently maps the first optional audio stream, and creates a master', async () => {
    succeedImmediately();
    const output = await transcodeToHLS('source.mp4', 'hls-output');
    expect(output).toBe(path.join('hls-output', 'master.m3u8'));
    expect(spawn).toHaveBeenCalledTimes(2);
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
  });
  it('surfaces failed FFmpeg exit code', async () => {
    vi.mocked(spawn).mockImplementation(() => {
      const proc = new EventEmitter() as any;
      proc.stderr = new EventEmitter();
      queueMicrotask(() => proc.emit('close', 1));
      return proc;
    });
    await expect(transcodeToHLS('source.mp4', 'hls-output')).rejects.toThrow(
      'FFmpeg exited with 1',
    );
  });
});
