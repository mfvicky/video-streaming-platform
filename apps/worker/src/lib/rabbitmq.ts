import amqp, { Channel, ChannelModel, ConsumeMessage } from 'amqplib';
import { env } from '../config/env.config';
import { logger } from './logger';

let connection: ChannelModel | null = null;
let channel: Channel | null = null;

/**
 * Establishes connection to RabbitMQ broker and initializes a channel
 */
export async function connectRabbitMQ(): Promise<{ connection: ChannelModel; channel: Channel }> {
  try {
    if (connection && channel) {
      return { connection, channel };
    }

    connection = await amqp.connect(env.RABBITMQ_URL);
    channel = await connection.createChannel();

    await channel.assertQueue(env.QUEUE_NAME, { durable: true });
    await channel.prefetch(1);

    logger.info(`[RabbitMQ Worker] Connected to queue: "${env.QUEUE_NAME}"`);

    // Handle connection errors/closures
    connection.on('error', (err) => {
      logger.error({ err }, '[RabbitMQ Worker] Connection error');
    });

    connection.on('close', () => {
      logger.warn('[RabbitMQ Worker] Connection closed');
      connection = null;
      channel = null;
    });

    return { connection, channel };
  } catch (error) {
    logger.error({ error }, '[RabbitMQ Worker] Failed to connect');
    throw error;
  }
}

/**
 * Reusable worker consumer method
 */
export async function consumeQueue<T>(
  onMessage: (payload: T, msg: ConsumeMessage, channel: Channel) => Promise<void>
): Promise<void> {
  const { channel: ch } = await connectRabbitMQ();

  ch.consume(
    env.QUEUE_NAME,
    async (msg: ConsumeMessage | null) => {
      if (!msg) return;

      try {
        const payload: T = JSON.parse(msg.content.toString());
        await onMessage(payload, msg, ch);
      } catch (err) {
        logger.error({ err }, '[RabbitMQ Worker] Error processing message payload');
      }
    },
    { noAck: false }
  );
}

/**
 * Gracefully closes RabbitMQ channel and connection on process exit
 */
export async function closeRabbitMQ(): Promise<void> {
  try {
    if (channel) await channel.close();
    if (connection) await connection.close();
    logger.info('[RabbitMQ Worker] Connections closed successfully');
  } catch (err) {
    logger.error({ err }, '[RabbitMQ Worker] Error while closing connections');
  }
}