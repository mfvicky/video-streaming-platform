import * as amqp from 'amqplib';
import type { ConfirmChannel, ConsumeMessage } from 'amqplib';
import { env } from '../config/env.config';
import { logger } from './logger';

export const retryQueueName = `${env.QUEUE_NAME}.retry`;
export const deadLetterQueueName = `${env.QUEUE_NAME}.dlq`;
export const deadLetterExchange = `${env.QUEUE_NAME}.dlx`;
const deadRoutingKey = 'failed';
const RETRY_DELAY_MS = 15_000;

let stopping = false;
let connection: amqp.ChannelModel | null = null;
let channel: ConfirmChannel | null = null;

/** The main queue retains its original durable declaration to support existing installations. */
async function assertTopology(ch: ConfirmChannel): Promise<void> {
  await ch.assertQueue(env.QUEUE_NAME, { durable: true });
  await ch.assertExchange(deadLetterExchange, 'direct', { durable: true });
  await ch.assertQueue(deadLetterQueueName, { durable: true });
  await ch.bindQueue(deadLetterQueueName, deadLetterExchange, deadRoutingKey);
  // Retry messages expire after 15s and are dead-lettered back to the work queue.
  await ch.assertQueue(retryQueueName, {
    durable: true,
    arguments: {
      'x-message-ttl': RETRY_DELAY_MS,
      'x-dead-letter-exchange': '',
      'x-dead-letter-routing-key': env.QUEUE_NAME,
    },
  });
  await ch.prefetch(1);
}

async function publishConfirmed(
  ch: ConfirmChannel,
  target: string,
  message: unknown,
  isExchange = false,
): Promise<void> {
  const bytes = Buffer.from(JSON.stringify(message));
  const opts = { persistent: true, contentType: 'application/json' };
  if (isExchange) ch.publish(target, deadRoutingKey, bytes, opts);
  else ch.sendToQueue(target, bytes, opts);
  await ch.waitForConfirms();
}

export async function publishRetry(message: unknown): Promise<void> {
  if (!channel) throw new Error('RabbitMQ worker channel is disconnected');
  await publishConfirmed(channel, retryQueueName, message);
}

export async function publishDeadLetter(
  message: unknown,
  reason: string,
): Promise<void> {
  if (!channel) throw new Error('RabbitMQ worker channel is disconnected');
  await publishConfirmed(
    channel,
    deadLetterExchange,
    {
      ...(message as object),
      failureReason: reason,
      failedAt: new Date().toISOString(),
    },
    true,
  );
}

/** Re-establish the consumer after broker restart or network interruption. */
export async function consumeQueue<T>(
  handler: (
    payload: T,
    msg: ConsumeMessage,
    ch: ConfirmChannel,
  ) => Promise<void>,
): Promise<void> {
  let delay = 1000;
  while (!stopping) {
    try {
      const con = await amqp.connect(env.RABBITMQ_URL);
      const ch = await con.createConfirmChannel();
      connection = con;
      channel = ch;
      await assertTopology(ch);
      delay = 1000;
      logger.info(
        { queue: env.QUEUE_NAME, retryQueueName, deadLetterQueueName },
        'RabbitMQ worker consuming',
      );
      con.on('error', (err) =>
        logger.error({ err }, 'RabbitMQ worker connection error'),
      );
      await new Promise<void>((resolve) => {
        con.once('close', resolve);
        ch.consume(
          env.QUEUE_NAME,
          async (msg) => {
            if (!msg) return;
            let payload: T;
            try {
              payload = JSON.parse(msg.content.toString()) as T;
              if (
                !payload ||
                typeof payload !== 'object' ||
                Array.isArray(payload)
              ) {
                throw new Error('RabbitMQ payload must be an object');
              }
            } catch {
              try {
                await publishDeadLetter(
                  { raw: msg.content.toString().slice(0, 2000) },
                  'Invalid JSON payload',
                );
                ch.ack(msg);
              } catch (err) {
                logger.error({ err }, 'Could not dead-letter invalid payload');
              }
              return;
            }
            try {
              await handler(payload, msg, ch);
            } catch (err) {
              // Do not ACK on unexpected failure. Broker redelivers on disconnect.
              logger.error({ err }, 'Unhandled worker processing error');
              try {
                ch.nack(msg, false, true);
              } catch {
                /* connection already closed */
              }
            }
          },
          { noAck: false },
        ).catch((err) => {
          logger.error({ err }, 'Consumer setup failed');
          void con.close();
        });
      });
      channel = null;
      connection = null;
    } catch (err) {
      logger.error({ err }, 'RabbitMQ connection failed; retrying');
    }
    if (!stopping) {
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay = Math.min(30_000, delay * 2);
    }
  }
}

export async function closeRabbitMQ(): Promise<void> {
  stopping = true;
  try {
    if (channel) await channel.close();
  } catch {
    /* already closed */
  }
  try {
    if (connection) await connection.close();
  } catch {
    /* already closed */
  }
  channel = null;
  connection = null;
}
