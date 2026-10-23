import type { Prisma, VideoStatus } from '@app/db';

export type VideoFilterParams = Record<string, unknown>;
const STATUS = new Set(['PENDING', 'PROCESSING', 'READY', 'FAILED']);
function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}
function num(value: unknown): number | undefined {
  if (typeof value !== 'string' || !value.trim()) return undefined;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}
function day(value: unknown, end: boolean): Date | undefined {
  const date = text(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return undefined;
  const parsed = new Date(`${date}T${end ? '23:59:59.999' : '00:00:00.000'}Z`);
  // Reject invalid calendar dates (e.g., February 30) instead of normalizing them.
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== date
  )
    return undefined;
  return parsed;
}
/** Resolution means ORIGINAL source height, not the number of HLS renditions. */
export function createVideoWhere(
  params: VideoFilterParams,
  creatorId?: string,
): Prisma.VideoWhereInput {
  const where: Prisma.VideoWhereInput = creatorId ? { creatorId } : {};
  const search = text(params.search).slice(0, 100);
  if (search) where.title = { contains: search, mode: 'insensitive' };
  const status = text(params.status).toUpperCase();
  if (STATUS.has(status)) where.status = status as VideoStatus;
  const resolution = text(params.resolution);
  if (resolution === '1080') where.height = { gte: 1080 };
  if (resolution === '720') where.height = { gte: 720, lt: 1080 };
  if (resolution === '480') where.height = { gte: 480, lt: 720 };
  if (resolution === 'under480') where.height = { lt: 480 };
  const from = day(params.from, false);
  const to = day(params.to, true);
  if (from || to)
    where.createdAt = {
      ...(from ? { gte: from } : {}),
      ...(to ? { lte: to } : {}),
    };
  const minDuration = num(params.minDuration);
  const maxDuration = num(params.maxDuration);
  if (minDuration !== undefined || maxDuration !== undefined) {
    where.durationSeconds = {
      ...(minDuration !== undefined ? { gte: minDuration } : {}),
      ...(maxDuration !== undefined ? { lte: maxDuration } : {}),
    };
  }
  return where;
}
