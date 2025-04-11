import { forwardRef, Module } from '@nestjs/common';
import { BestOf7BetController } from './best-of7-bet.controller';
import { BestOf7BetService } from './best-of7-bet.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BestOf7BetRepository } from './bestOf7.repository';
import { AuthModule } from '../auth/auth.module';
import { SeriesModule } from 'src/series/series.module';
import { BestOf7GuessModule } from 'src/best-of7-guess/best-of7-guess.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([BestOf7BetRepository]),
    forwardRef(() => AuthModule),
    forwardRef(() => SeriesModule),
    forwardRef(() => BestOf7GuessModule),
  ],
  controllers: [BestOf7BetController],
  providers: [BestOf7BetService, BestOf7BetRepository],
  exports: [BestOf7BetService],
})
export class BestOf7BetModule {}
