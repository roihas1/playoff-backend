import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { TransformInterceptor } from './transform.interceptor';
import { UnauthorizedExceptionFilter } from './filters/unauthorizedException.Filter';
import { AppLogger } from './logging/logger.service';
import * as crypto from 'crypto';
import * as compression from 'compression';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = app.get(AppLogger);
  const allowedOrigin = process.env.FRONTEND_URL || 'http://localhost:5173';
  app.enableCors({
    origin: allowedOrigin,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  Object.defineProperty(global, 'crypto', {
    value: crypto,
  });
  app.use(compression());
  app.useLogger(logger);
  app.useGlobalPipes(new ValidationPipe());
  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalFilters(new UnauthorizedExceptionFilter());
  const port = 3000;
  await app.listen(port, '0.0.0.0');
  // logger.log(process.env.FRONTEND_URL +"hello", 'Main');

  logger.log(`Application listening on port ${port}`, 'Main');
}
bootstrap();
