import { describe, expect, it } from 'vitest';
import { createVideoWhere } from './video-filters';

describe('Day 3 creator/admin video filters', () => {
  it('keeps creator ownership in server-side query and performs insensitive search', () => {
    const where = createVideoWhere(
      { search: ' webinar ', status: 'READY' },
      'creator-1',
    );
    expect(where).toMatchObject({
      creatorId: 'creator-1',
      title: { contains: 'webinar', mode: 'insensitive' },
      status: 'READY',
    });
  });
  it('uses actual original height; a 1280x544 movie belongs in 480-719p', () => {
    expect(createVideoWhere({ resolution: '480' }).height).toEqual({
      gte: 480,
      lt: 720,
    });
    expect(createVideoWhere({ resolution: '720' }).height).toEqual({
      gte: 720,
      lt: 1080,
    });
    expect(createVideoWhere({ resolution: '1080' }).height).toEqual({
      gte: 1080,
    });
  });
  it('filters UTC upload dates and duration boundaries', () => {
    expect(
      createVideoWhere({
        from: '2026-10-01',
        to: '2026-10-22',
        minDuration: '60',
        maxDuration: '3600',
      }),
    ).toEqual({
      createdAt: {
        gte: new Date('2026-10-01T00:00:00.000Z'),
        lte: new Date('2026-10-22T23:59:59.999Z'),
      },
      durationSeconds: { gte: 60, lte: 3600 },
    });
  });
  it('ignores invalid calendar dates without normalizing them', () => {
    expect(createVideoWhere({ from: '2026-02-30', to: '2026-13-01' })).toEqual(
      {},
    );
    expect(createVideoWhere({ from: '2024-02-29' }).createdAt).toEqual({
      gte: new Date('2024-02-29T00:00:00.000Z'),
    });
  });
  it('ignores invalid filters instead of passing unchecked data to Prisma', () => {
    expect(
      createVideoWhere({
        status: 'ADMIN',
        resolution: '8K',
        minDuration: '-10',
      }),
    ).toEqual({});
  });
});
