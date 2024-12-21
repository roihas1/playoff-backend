import { Body, Controller, Logger, Post, UseGuards } from '@nestjs/common';
import { PlayerMatchupBetService } from './player-matchup-bet.service';
import { AuthGuard } from '@nestjs/passport';
import { CreatePlayerMatchupBetDto } from './dto/create-player-matchup-bet.dto';
import { GetUser } from 'src/auth/get-user.decorator';
import { User } from 'src/auth/user.entity';
import { PlayerMatchupBet } from './player-matchup-bet.entity';

@Controller('player-matchup-bet')
@UseGuards(AuthGuard())
export class PlayerMatchupBetController {
  private logger = new Logger('PlayerMatchupBetController', {
    timestamp: true,
  });
  constructor(private playerMatchupBetService: PlayerMatchupBetService) {}

  @Post()
  async createPlayerMatchupBet(
    @Body() createPlayerMatchupBetDto: CreatePlayerMatchupBetDto,
    @GetUser() user: User,
  ): Promise<PlayerMatchupBet> {
    this.logger.verbose(
      `User "${user.username}" creating new Player Matchup bet. Data: ${JSON.stringify(createPlayerMatchupBetDto)}.`,
    );
    return await this.playerMatchupBetService.createPlayerMatchupBet(
      createPlayerMatchupBetDto,
    );
  }
}
