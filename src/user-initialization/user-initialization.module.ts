import { forwardRef, Module } from '@nestjs/common';
import { UserInitializationService } from './user-initialization.service';
import { UserMissingBetsModule } from 'src/user-missing-bets/user-missing-bets.module';
import { UserSeriesPointsModule } from 'src/user-series-points/user-series-points.module';

@Module({
  imports: [
    forwardRef(() => UserSeriesPointsModule),
    forwardRef(() => UserMissingBetsModule),
  ],
  providers: [UserInitializationService],
  exports: [UserInitializationService],
})
export class UserInitializationModule {}
