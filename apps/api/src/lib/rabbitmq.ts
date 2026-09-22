import * as amqp from 'amqplib';
import { env } from '../config/env';
import { logger } from './logger';

let connection: amqp.ChannelModel | null = null;
let channel: amqp.Channel | null = null;

export async function connectRabbitMQ(): Promise<void> {
  try {
    connection = await amqp.connect(env.RABBITMQ_URL);
    channel = await connection.createChannel();

    if (!channel) {
      throw new Error('Failed to create RabbitMQ channel');
    }

    await channel.assertQueue(env.QUEUE_NAME, { durable: true });
    logger.info(`Connected to RabbitMQ queue: ${env.QUEUE_NAME}`);
  } catch (error) {
    logger.error({ error }, 'Failed to connect to RabbitMQ');
  }
}

export async function closeRabbitMQ(): Promise<void> {
  try {
    if (channel) {
      await channel.close();
      channel = null;
    }
    if (connection) {
      await connection.close();
      connection = null;
    }
    logger.info('RabbitMQ connection closed.');
  } catch (error) {
    logger.error({ error }, 'Error while closing RabbitMQ connection');
  }
}