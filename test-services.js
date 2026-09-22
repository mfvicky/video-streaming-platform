require('dotenv').config();

const { Client } = require('pg');
const { createClient } = require('redis');
const amqp = require('amqplib');
const Minio = require('minio');

async function testPostgres() {
  console.log('\n--- Testing PostgreSQL ---');
  const client = new Client({
    host: 'localhost',
    port: process.env.POSTGRES_PORT || 5432,
    user: process.env.POSTGRES_USER || 'app',
    password: process.env.POSTGRES_PASSWORD || 'app_password',
    database: process.env.POSTGRES_DB || 'app_db',
  });

  try {
    await client.connect();
    const res = await client.query('SELECT NOW() as current_time;');
    console.log('PostgreSQL Connected! Server time:', res.rows[0].current_time);
  } catch (err) {
    console.error('PostgreSQL Connection Failed:', err.message);
  } finally {
    await client.end();
  }
}

async function testRedis() {
  console.log('\n--- Testing Redis ---');
  const redisClient = createClient({
    url: `redis://localhost:${process.env.REDIS_PORT || 6379}`,
  });

  redisClient.on('error', (err) => console.error('Redis Error:', err.message));

  try {
    await redisClient.connect();
    await redisClient.set('test_key', 'Hello from Node.js!');
    const value = await redisClient.get('test_key');
    console.log('Redis Connected! Retrieved value:', value);
  } catch (err) {
    console.error('Redis Connection Failed:', err.message);
  } finally {
    await redisClient.disconnect();
  }
}

async function testRabbitMQ() {
  console.log('\n--- Testing RabbitMQ ---');
  const user = process.env.RABBITMQ_DEFAULT_USER || 'guest';
  const pass = process.env.RABBITMQ_DEFAULT_PASS || 'guest';
  const port = process.env.RABBITMQ_PORT || 5672;
  const url = `amqp://${user}:${pass}@localhost:${port}`;

  try {
    const connection = await amqp.connect(url);
    const channel = await connection.createChannel();
    const queue = 'test_queue';

    await channel.assertQueue(queue, { durable: false });
    channel.sendToQueue(queue, Buffer.from('Test Message'));
    console.log('RabbitMQ Connected & Message Sent to queue!');

    await channel.close();
    await connection.close();
  } catch (err) {
    console.error('RabbitMQ Connection Failed:', err.message);
  }
}

async function testMinIO() {
  console.log('\n--- Testing MinIO ---');
  const minioClient = new Minio.Client({
    endPoint: 'localhost',
    port: parseInt(process.env.MINIO_API_PORT || '9000', 10),
    useSSL: false,
    accessKey: process.env.MINIO_ROOT_USER || 'minioadmin',
    secretKey: process.env.MINIO_ROOT_PASSWORD || 'minioadminpassword',
  });

  try {
    const buckets = await minioClient.listBuckets();
    console.log('MinIO Connected! Total Buckets:', buckets.length);
  } catch (err) {
    console.error('MinIO Connection Failed:', err.message);
  }
}

async function runAllTests() {
  await testPostgres();
  await testRedis();
  await testRabbitMQ();
  await testMinIO();
  console.log('\n--- Testing: All Connectivity Checks Completed ---');
}

runAllTests();