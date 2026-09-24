
import pino from 'pino';
import path from 'path';
import { env } from '../config/env';

// Determine log directory (e.g., apps/api/logs/app.log)
// const logFilePath = path.join(process.cwd(), 'logs', 'app.log');

const targets: pino.TransportTargetOptions[] = [
  // Target 1: Console / Terminal Output
  {
    target: env.NODE_ENV === 'development' ? 'pino-pretty' : 'pino/file',
    options:
      env.NODE_ENV === 'development'
        ? { colorize: true, translateTime: 'SYS:yyyy-mm-dd HH:MM:ss', ignore: 'pid,hostname' }
        : { destination: 1 }, // stdout in production
    level: env.LOG_LEVEL ,
  },
  // Target 2: Local File Output (Saves JSON or formatted text to disk)
  // {
  //   target: 'pino/file',
  //   options: {
  //     destination: logFilePath,
  //     mkdir: true, // Automatically creates the /logs directory if missing
  //   },
  //   level: env.LOG_LEVEL ,
  // },
];

export const logger = pino({
  level: env.LOG_LEVEL ,
  transport: {
    targets,
  },
});