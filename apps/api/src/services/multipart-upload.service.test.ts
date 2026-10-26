import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../__mocks__/infrastructure';

vi.mock('../lib/prisma', () => ({ prisma: prismaMock }));
vi.mock('../lib/rabbitmq', () => ({ publishToQueue: vi.fn() }));

const { send } = vi.hoisted(() => ({ send: vi.fn() }));
vi.mock('@aws-sdk/client-s3', async (original) => {
  const sdk = await original<typeof import('@aws-sdk/client-s3')>();
  return {
    ...sdk,
    S3Client: class MockS3Client {
      send = send;
    },
  };
});

import {
  initiateMultipart,
  MAX_FILE_BYTES,
  UploadHttpError,
  putMultipartPart,
} from './multipart-upload.service';

describe('S3 multipart upload validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    send.mockResolvedValue({ UploadId: 's3-multipart-id' });
  });

  it('rejects empty, oversize or unsupported uploads before touching S3', async () => {
    await expect(
      initiateMultipart('u1', 'Demo', 'demo.mp4', 'video/mp4', 0),
    ).rejects.toBeInstanceOf(UploadHttpError);
    await expect(
      initiateMultipart(
        'u1',
        'Demo',
        'demo.mp4',
        'video/mp4',
        MAX_FILE_BYTES + 1,
      ),
    ).rejects.toBeInstanceOf(UploadHttpError);
    await expect(
      initiateMultipart('u1', 'Demo', 'bad.exe', 'video/mp4', 500),
    ).rejects.toBeInstanceOf(UploadHttpError);
    expect(send).not.toHaveBeenCalled();
  });

  it('creates a persistent session scoped to the authenticated creator', async () => {
    prismaMock.uploadSession.create.mockResolvedValue({ id: 'session-1' });
    const result = await initiateMultipart(
      'u1',
      'Demo',
      'demo.mp4',
      'video/mp4',
      200,
    );
    expect(result).toMatchObject({
      sessionId: 'session-1',
      status: 'OPEN',
      parts: [],
      partSize: 8 * 1024 * 1024,
    });
    expect(prismaMock.uploadSession.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ creatorId: 'u1', fileSize: 200 }),
    });
  });

  it('does not allow another creator to upload parts', async () => {
    prismaMock.uploadSession.findUnique.mockResolvedValue({
      id: 'session-1',
      creatorId: 'creator-A',
    });
    await expect(
      putMultipartPart('session-1', 'creator-B', 1, { headers: {} } as never),
    ).rejects.toMatchObject({ code: 404 });
    expect(send).not.toHaveBeenCalled();
  });
});
