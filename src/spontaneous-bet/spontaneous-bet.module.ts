import { Module } from '@nestjs/common';
import { SpontaneousBetController } from './spontaneous-bet.controller';
import { SpontaneousBetService } from './spontaneous-bet.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SpontaneousBetRepo } from './spontaneous-bet.repository';

@Module({
  imports: [TypeOrmModule.forFeature([SpontaneousBetRepo])],
  controllers: [SpontaneousBetController],
  providers: [SpontaneousBetService, SpontaneousBetRepo],
  exports: [SpontaneousBetService],
})
export class SpontaneousBetModule {}
