import { env } from './src/config/env';
import { prisma } from './src/lib/prisma';
import Redis from 'ioredis';
import amqp from 'amqplib';
import * as Minio from 'minio';

async function testPostgres(): Promise<void> {
  console.log('\n--- Testing PostgreSQL (Prisma) ---');
  try {
    const result = await prisma.$queryRaw<{ current_time: Date }[]>`SELECT NOW() as current_time`;
    console.log(`[SUCCESS] PostgreSQL Connected. Server time: ${result[0]?.current_time}`);
  } catch (err: any) {
    console.error('[ERROR] PostgreSQL Connection Failed:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

async function testRedis(): Promise<void> {
  console.log('\n--- Testing Redis ---');
  const redis = new Redis(env.REDIS_URL, { maxRetriesPerRequest: 1, lazyConnect: true });

  try {
    await redis.connect();
    await redis.set('test_key', 'Hello from API Workspace Test!');
    const value = await redis.get('test_key');
    console.log(`[SUCCESS] Redis Connected. Retrieved value: ${value}`);
  } catch (err: any) {
    console.error('[ERROR] Redis Connection Failed:', err.message);
  } finally {
    await redis.quit();
  }
}

async function testRabbitMQ(): Promise<void> {
  console.log('\n--- Testing RabbitMQ ---');
  try {
    const connection = await amqp.connect(env.RABBITMQ_URL);
    const channel = await connection.createChannel();
    const queue = 'test_queue';

    await channel.assertQueue(queue, { durable: false });
    channel.sendToQueue(queue, Buffer.from('Test Message'));
    console.log('[SUCCESS] RabbitMQ Connected. Message sent to queue.');

    await channel.close();
    await connection.close();
  } catch (err: any) {
    console.error('[ERROR] RabbitMQ Connection Failed:', err.message);
  }
}

async function testMinIO(): Promise<void> {
  console.log('\n--- Testing MinIO ---');
  const minioClient = new Minio.Client({
    endPoint: env.MINIO_ENDPOINT || 'localhost',
    port: env.MINIO_PORT ? Number(env.MINIO_PORT) : 9000,
    useSSL: env.MINIO_USE_SSL,
    accessKey: env.MINIO_ACCESS_KEY || 'minioadmin',
    secretKey: env.MINIO_SECRET_KEY || 'minioadminpassword',
  });

  try {
    const buckets = await minioClient.listBuckets();
    console.log(`[SUCCESS] MinIO Connected. Total Buckets: ${buckets.length}`);
  } catch (err: any) {
    console.error('[ERROR] MinIO Connection Failed:', err.message);
  }
}

async function runAllTests(): Promise<void> {
  await testPostgres();
  await testRedis();
  await testRabbitMQ();
  await testMinIO();
  console.log('\n==================================================');
  console.log('All Service Connectivity Checks Completed');
  console.log('==================================================\n');
  process.exit(0);
}

runAllTests();