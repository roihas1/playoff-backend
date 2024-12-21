import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { PlayerMatchupBet } from './player-matchup-bet.entity';
import { CreatePlayerMatchupBetDto } from './dto/create-player-matchup-bet.dto';

@Injectable()
export class PlayerMatchupBetRepository extends Repository<PlayerMatchupBet> {
  private logger = new Logger('PlayerMatchupBetRepository', {
    timestamp: true,
  });
  constructor(dataSource: DataSource) {
    super(PlayerMatchupBet, dataSource.createEntityManager());
  }
  async createPlayerMatchupBet(
    createPlayerMatchupBetDto: CreatePlayerMatchupBetDto,
  ): Promise<PlayerMatchupBet> {
    const {
      seriesId,
      typeOfMatchup,
      categories,
      fantasyPoints,
      player1,
      player2,
      differential,
      result,
    } = createPlayerMatchupBetDto;
    const playerMatchupBet = this.create({
      seriesId,
      typeOfMatchup,
      categories,
      fantasyPoints,
      player1,
      player2,
      differential,
      result,
    });
    try {
      const savedPlayerMatchupBet = await this.save(playerMatchupBet);
      this.logger.verbose(
        `Player matchup bet "${savedPlayerMatchupBet.id}" created successfully.`,
      );
      return savedPlayerMatchupBet;
    } catch (error) {
      this.logger.error(`Failed to create player matchup bet.`, error.stack);

      throw new InternalServerErrorException();
    }
  }
}
