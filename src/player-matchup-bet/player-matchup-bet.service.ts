import { Injectable, Logger } from '@nestjs/common';
import { PlayerMatchupBetRepository } from './player-matchup-bet.repository';
import { CreatePlayerMatchupBetDto } from './dto/create-player-matchup-bet.dto';
import { PlayerMatchupBet } from './player-matchup-bet.entity';

@Injectable()
export class PlayerMatchupBetService {
  private logger = new Logger('PlayerMatchupBetService', { timestamp: true });
  constructor(private playerMatcupBetRepository: PlayerMatchupBetRepository) {}

  async createPlayerMatchupBet(
    createPlayerMatchupBetDto: CreatePlayerMatchupBetDto,
  ): Promise<PlayerMatchupBet> {
    this.logger.verbose(`Trying to create PlayerMatchupBet.`);
    return await this.playerMatcupBetRepository.createPlayerMatchupBet(
      createPlayerMatchupBetDto,
    );
  }
}
