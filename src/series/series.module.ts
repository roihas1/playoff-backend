import { Module } from '@nestjs/common';
import { SeriesController } from './series.controller';
import { SeriesService } from './series.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeriesRepository } from './series.repository';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([SeriesRepository]), AuthModule],
  controllers: [SeriesController],
  providers: [SeriesService, SeriesRepository],
})
export class SeriesModule {}
