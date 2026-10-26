/**
 * Real Docker-backed smoke test: API -> MinIO -> RabbitMQ -> worker -> HLS.
 * Prerequisites: docker compose up -d --build; existing CREATOR account;
 * VIDEO_FIXTURE_PATH points to a short (1-5 seconds) MP4.
 * From repo root (PowerShell):
 * $env:TEST_EMAIL='creator@example.com'; $env:TEST_PASSWORD='...';
 * $env:VIDEO_FIXTURE_PATH='D:\\samples\\short.mp4'
 * pnpm --filter api exec node scripts/integration-media.mjs
 * Never use production credentials; this creates and normally deletes a video.
 */
import dotenv from 'dotenv';
import { Client } from 'minio';
import { publicEncrypt, constants } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

dotenv.config({ path: path.resolve(process.cwd(), '../../.env'), quiet: true });
const api = process.env.TEST_API_URL || 'http://localhost:3000/api/v1';
const origin = process.env.CORS_ORIGIN || 'http://localhost:3001';
const email = process.env.TEST_EMAIL;
const password = process.env.TEST_PASSWORD;
const fixture = process.env.VIDEO_FIXTURE_PATH;
if (!email || !password || !fixture) {
  throw new Error('Set TEST_EMAIL, TEST_PASSWORD, VIDEO_FIXTURE_PATH before running integration-media.mjs');
}
const publicKey = process.env.RSA_PUBLIC_KEY?.replace(/^['"]|['"]$/g, '').replace(/\\n/g, '\n');
if (!publicKey) throw new Error('RSA_PUBLIC_KEY required in root .env');
const crypted = publicEncrypt({ key: publicKey, padding: constants.RSA_PKCS1_PADDING }, Buffer.from(password)).toString('base64');
let cookie = '';
async function call(endpoint, options = {}) {
  const headers = new Headers(options.headers);
  if (cookie) headers.set('cookie', cookie);
  if (options.method && !['GET', 'HEAD'].includes(options.method)) headers.set('origin', origin);
  const response = await fetch(`${api}${endpoint}`, { ...options, headers });
  return response;
}
async function json(response, expected) {
  const text = await response.text();
  if (response.status !== expected) throw new Error(`Unexpected HTTP ${response.status} (expected ${expected}): ${text.slice(0, 300)}`);
  return JSON.parse(text);
}
let videoId;
try {
  const login = await call('/auth/login', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: crypted }),
  });
  await json(login, 200);
  const setCookies = login.headers.getSetCookie?.() ?? [login.headers.get('set-cookie') ?? ''];
  cookie = setCookies.map((c) => c.split(';')[0]).find((c) => c.startsWith('accessToken=')) ?? '';
  if (!cookie) throw new Error('Login did not set an accessToken HttpOnly cookie');
  console.log('Authenticated via cookie');

  const input = await fs.readFile(fixture);
  if (input.length > 30 * 1024 * 1024) throw new Error('Use a short fixture under 30 MiB for smoke test');
  const data = new FormData();
  const title = `Integration test ${Date.now()}`;
  data.append('title', title);
  data.append('video', new Blob([input], { type: 'video/mp4' }), path.basename(fixture));
  const upload = await json(await call('/video/upload', { method: 'POST', body: data }), 201);
  videoId = upload.data?.id;
  if (!videoId) throw new Error('Upload response missing video ID');
  console.log(`Uploaded ${videoId}; waiting for RabbitMQ worker`);

  let result;
  const deadline = Date.now() + 180_000;
  while (Date.now() < deadline) {
    const listing = await json(await call('/video/creator'), 200);
    result = listing.videos?.find((v) => v.id === videoId);
    if (!result) throw new Error('Uploaded video missing from creator list');
    if (result.status === 'READY') break;
    if (result.status === 'FAILED') throw new Error(`Transcoding failed: ${result.processingError}`);
    await new Promise((resolve) => setTimeout(resolve, 2500));
  }
  if (result?.status !== 'READY') throw new Error(`Worker did not finish in 180s (status=${result?.status})`);
  if (!result.durationSeconds || !result.width || !result.height || !result.videoCodec) {
    throw new Error('FFprobe metadata not persisted');
  }
  console.log(`Processed READY; metadata ${result.width}x${result.height} ${result.videoCodec}`);

  const masterResponse = await call(`/video/hls/${encodeURIComponent(videoId)}/master.m3u8`);
  if (!masterResponse.ok) throw new Error(`Public HLS master returned ${masterResponse.status}`);
  const manifest = await masterResponse.text();
  if (!manifest.includes('#EXT-X-STREAM-INF')) throw new Error('Invalid master HLS playlist');
  const level = manifest.split('\n').find((line) => /^\d+\/manifest\.m3u8$/.test(line.trim()))?.trim();
  if (!level) throw new Error('No HLS rendition playlist');
  const leafResponse = await call(`/video/hls/${videoId}/${level}`);
  if (!leafResponse.ok) throw new Error('HLS variant playlist not reachable');
  const leaf = await leafResponse.text();
  const segment = leaf.split('\n').find((line) => /^segment_\d+\.ts$/.test(line.trim()))?.trim();
  if (!segment) throw new Error('HLS playlist has no transport-stream segments');
  const stream = await call(`/video/hls/${videoId}/${level.split('/')[0]}/${segment}`);
  if (!stream.ok || (await stream.arrayBuffer()).byteLength === 0) throw new Error('HLS segment not accessible');
  console.log('Browser-compatible HLS playlist and segment accessible');

  const minio = new Client({ endPoint: process.env.TEST_MINIO_HOST || '127.0.0.1',
    port: Number(process.env.TEST_MINIO_PORT || 9000), useSSL: false,
    accessKey: process.env.MINIO_ROOT_USER || process.env.MINIO_ACCESS_KEY,
    secretKey: process.env.MINIO_ROOT_PASSWORD || process.env.MINIO_SECRET_KEY });
  const bucket = process.env.MINIO_BUCKET_NAME || 'videos';
  for (const key of [result.rawPath, `hls/${videoId}/master.m3u8`, `hls/${videoId}/${level}`, `hls/${videoId}/${level.split('/')[0]}/${segment}`]) {
    if (!key) throw new Error('Missing MinIO object key');
    const stat = await minio.statObject(bucket, key);
    if (!stat.size) throw new Error(`MinIO object empty: ${key}`);
  }
  console.log('MinIO original and HLS objects verified. E2E PASS');
} finally {
  if (videoId && process.env.KEEP_TEST_VIDEO !== '1') {
    try {
      const del = await call(`/video/${encodeURIComponent(videoId)}`, { method: 'DELETE' });
      console.log(`Cleanup video ${videoId}: ${del.status}`);
    } catch (error) { console.error('Manual cleanup required:', error); }
  }
}
