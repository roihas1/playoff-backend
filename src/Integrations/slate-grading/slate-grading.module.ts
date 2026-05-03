import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SlateGradingClient } from './slate-grading.client';

@Module({
  imports: [
    ConfigModule,
    HttpModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        timeout: configService.get<number>('STATS_SERVICE_TIMEOUT_MS', 120000),
        maxRedirects: 5,
      }),
    }),
  ],
  providers: [SlateGradingClient],
  exports: [SlateGradingClient],
})
export class SlateGradingModule {}
