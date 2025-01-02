import { Module } from '@nestjs/common';
import { BestOf7GuessController } from './best-of7-guess.controller';
import { BestOf7GuessService } from './best-of7-guess.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/auth/auth.module';
import { BestOf7GuessRepository } from './best-of7-guess.repository';
import { BestOf7BetModule } from 'src/best-of7-bet/best-of7-bet.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([BestOf7GuessRepository]),
    AuthModule,
    BestOf7BetModule,
  ],
  controllers: [BestOf7GuessController],
  providers: [BestOf7GuessService, BestOf7GuessRepository],
  exports: [BestOf7GuessService],
})
export class BestOf7GuessModule {}
