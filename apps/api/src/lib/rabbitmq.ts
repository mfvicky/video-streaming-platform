import * as amqp from 'amqplib';
import { env } from '../config/env.js';
import { logger } from './logger.js';

let connection: amqp.ChannelModel | null = null;
let channel: amqp.ConfirmChannel | null = null;

/** ConfirmChannel ensures a successful API response means RabbitMQ accepted the job. */
export async function connectRabbitMQ(): Promise<void> {
  if (connection && channel) return;
  const con = await amqp.connect(env.RABBITMQ_URL);
  try {
    const ch = await con.createConfirmChannel();
    await ch.assertQueue(env.QUEUE_NAME, { durable: true });
    connection = con;
    channel = ch;
    con.on('close', () => {
      connection = null;
      channel = null;
    });
    con.on('error', (error) =>
      logger.error({ error }, 'RabbitMQ connection error'),
    );
    logger.info(`Connected to RabbitMQ queue: ${env.QUEUE_NAME}`);
  } catch (err) {
    await con.close().catch(() => {});
    throw err;
  }
}

export async function publishToQueue(
  queueName: string,
  message: object,
): Promise<boolean> {
  if (!channel) await connectRabbitMQ();
  const ch = channel;
  if (!ch) throw new Error('RabbitMQ channel unavailable');
  await ch.assertQueue(queueName, { durable: true });
  ch.sendToQueue(queueName, Buffer.from(JSON.stringify(message)), {
    persistent: true,
    contentType: 'application/json',
  });
  await ch.waitForConfirms();
  return true;
}

export async function closeRabbitMQ(): Promise<void> {
  try {
    if (channel) await channel.close();
  } catch (err) {
    logger.warn({ err }, 'RabbitMQ channel close failed');
  }
  try {
    if (connection) await connection.close();
  } catch (err) {
    logger.warn({ err }, 'RabbitMQ connection close failed');
  }
  channel = null;
  connection = null;
}
