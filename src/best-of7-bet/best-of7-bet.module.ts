import { Module } from '@nestjs/common';
import { BestOf7BetController } from './best-of7-bet.controller';
import { BestOf7BetService } from './best-of7-bet.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BestOf7BetRepository } from './bestOf7.repository';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([BestOf7BetRepository]), AuthModule],
  controllers: [BestOf7BetController],
  providers: [BestOf7BetService, BestOf7BetRepository],
  exports: [BestOf7BetService],
})
export class BestOf7BetModule {}
