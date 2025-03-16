import { Injectable, LoggerService } from '@nestjs/common';
import * as winston from 'winston';
import 'winston-daily-rotate-file';

@Injectable()
export class AppLogger implements LoggerService {
  private logger: winston.Logger;

  constructor() {
    this.logger = winston.createLogger({
      level: 'verbose',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message, context }) => {
          return `${timestamp} [${level.toUpperCase()}] [${context}]: ${message}`;
        }),
      ),
      transports: [
        new winston.transports.Console(),
        new winston.transports.DailyRotateFile({
          filename: 'logs/app-%DATE%.log',
          datePattern: 'YYYY-MM-DD-HH',
          maxSize: '20m',
          maxFiles: '7d',
        }),
      ],
    });
  }

  log(message: string, context: string) {
    this.logger.info({ message, context });
  }

  error(message: string, context: string, trace?: string) {
    this.logger.error({ message: `${message} - ${trace || ''}`, context });
  }

  warn(message: string, context: string) {
    this.logger.warn({ message, context });
  }

  debug(message: string, context: string) {
    this.logger.debug({ message, context });
  }

  verbose(message: string, context: string) {
    this.logger.verbose({ message, context });
  }
}
