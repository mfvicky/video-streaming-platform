import { describe, it, expect, vi, beforeEach } from 'vitest';
import { spawn } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import EventEmitter from 'events';

// 1. Mock child_process and fs-extra before importing the service
vi.mock('child_process', () => ({
  spawn: vi.fn(),
}));

vi.mock('fs-extra', () => ({
  default: {
    ensureDir: vi.fn().mockResolvedValue(undefined),
    writeFile: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@ffmpeg-installer/ffmpeg', () => ({
  default: {
    path: '/mock/path/to/ffmpeg',
  },
}));

// Helper to construct a mocked ChildProcess stream
function createMockChildProcess() {
  const proc = new EventEmitter() as any;
  proc.stderr = new EventEmitter();
  proc.stdout = new EventEmitter();
  return proc;
}

// 2. Import service module under test
import { extractThumbnail, transcodeToHLS } from './ffmpeg.service';

describe('FFmpeg Service Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('extractThumbnail', () => {
    const inputPath = 'uploads/raw/test-video.mp4';
    const outputPath = 'uploads/thumbnails/test-thumb.png';

    it('should resolve with clean output path when FFmpeg exits with code 0', async () => {
      const mockProc = createMockChildProcess();
      vi.mocked(spawn).mockReturnValue(mockProc as any);

      const promise = extractThumbnail(inputPath, outputPath);

      mockProc.stderr.emit('data', Buffer.from('Processing frame 1...'));
      mockProc.emit('close', 0);

      const result = await promise;

      const expectedInput = path.resolve(inputPath).replace(/\\/g, '/');
      const expectedOutput = path.resolve(outputPath).replace(/\\/g, '/');

      expect(spawn).toHaveBeenCalledWith(
        '/mock/path/to/ffmpeg',
        [
          '-y',
          '-ss', '00:00:01',
          '-i', expectedInput,
          '-vframes', '1',
          '-q:v', '2',
          expectedOutput,
        ]
      );
      expect(result).toBe(expectedOutput);
    });

    it('should reject with an error when FFmpeg exits with non-zero code', async () => {
      const mockProc = createMockChildProcess();
      vi.mocked(spawn).mockReturnValue(mockProc as any);

      const promise = extractThumbnail(inputPath, outputPath);

      mockProc.stderr.emit('data', Buffer.from('Error opening file'));
      mockProc.emit('close', 1);

      await expect(promise).rejects.toThrow('FFmpeg thumbnail extraction failed with exit code 1');
    });

    it('should reject when process spawn emits an error event', async () => {
      const mockProc = createMockChildProcess();
      vi.mocked(spawn).mockReturnValue(mockProc as any);

      const promise = extractThumbnail(inputPath, outputPath);

      mockProc.emit('error', new Error('FFmpeg binary not found'));

      await expect(promise).rejects.toThrow('FFmpeg binary not found');
    });
  });

  describe('transcodeToHLS', () => {
    const inputPath = 'uploads/raw/test-video.mp4';
    const outputDir = 'uploads/hls/vid_12345';

    it('should transcode video, generate master playlist, and return playlist path on success', async () => {
      const mockProc = createMockChildProcess();
      vi.mocked(spawn).mockReturnValue(mockProc as any);
      vi.mocked(fs.ensureDir).mockResolvedValue(undefined as never);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined as never);

      const promise = transcodeToHLS(inputPath, outputDir);

      // Wait for process listeners to attach after fs.ensureDir resolves
      await new Promise(process.nextTick);

      mockProc.stderr.emit('data', Buffer.from('frame=  100 fps=30 q=28.0 size=N/A time=00:00:03.33'));
      mockProc.emit('close', 0);

      const result = await promise;

      expect(fs.ensureDir).toHaveBeenCalledWith(path.join(outputDir, '0'));
      expect(fs.ensureDir).toHaveBeenCalledWith(path.join(outputDir, '1'));

      const expectedMasterPath = path.join(outputDir, 'master.m3u8').replace(/\\/g, '/');
      expect(fs.writeFile).toHaveBeenCalledWith(
        path.join(outputDir, 'master.m3u8'),
        expect.stringContaining('#EXTM3U'),
        'utf-8'
      );

      const cleanInput = path.resolve(inputPath).replace(/\\/g, '/');
      const cleanOutputDir = outputDir.replace(/\\/g, '/');

      expect(spawn).toHaveBeenCalledWith(
        '/mock/path/to/ffmpeg',
        expect.arrayContaining([
          '-i', cleanInput,
          '-filter_complex', expect.stringContaining('split=2'),
          '-hls_segment_filename', `${cleanOutputDir}/%v/segment_%03d.ts`,
          `${cleanOutputDir}/%v/manifest.m3u8`,
        ])
      );

      expect(result).toBe(expectedMasterPath);
    });

    it('should reject when FFmpeg transcoding exits with non-zero code', async () => {
      const mockProc = createMockChildProcess();
      vi.mocked(spawn).mockReturnValue(mockProc as any);
      vi.mocked(fs.ensureDir).mockResolvedValue(undefined as never);

      const promise = transcodeToHLS(inputPath, outputDir);

      await new Promise(process.nextTick);

      mockProc.emit('close', 1);

      await expect(promise).rejects.toThrow('FFmpeg processing failed with exit code 1');
    });

    it('should reject if filesystem operations fail during master playlist creation', async () => {
      const mockProc = createMockChildProcess();
      vi.mocked(spawn).mockReturnValue(mockProc as any);
      vi.mocked(fs.ensureDir).mockResolvedValue(undefined as never);
      vi.mocked(fs.writeFile).mockRejectedValue(new Error('Disk write error') as never);

      const promise = transcodeToHLS(inputPath, outputDir);

      await new Promise(process.nextTick);

      mockProc.emit('close', 0);

      await expect(promise).rejects.toThrow('Disk write error');
    });

    it('should reject if spawn process emits an error', async () => {
      const mockProc = createMockChildProcess();
      vi.mocked(spawn).mockReturnValue(mockProc as any);
      vi.mocked(fs.ensureDir).mockResolvedValue(undefined as never);

      const promise = transcodeToHLS(inputPath, outputDir);

      await new Promise(process.nextTick);

      mockProc.emit('error', new Error('Spawn process failed'));

      await expect(promise).rejects.toThrow('Spawn process failed');
    });
  });
});