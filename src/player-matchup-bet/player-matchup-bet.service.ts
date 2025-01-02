import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PlayerMatchupBetRepository } from './player-matchup-bet.repository';
import { CreatePlayerMatchupBetDto } from './dto/create-player-matchup-bet.dto';
import { PlayerMatchupBet } from './player-matchup-bet.entity';
import { UpdateResultDto } from './dto/update-result.dto';
import { UpdateFieldsDto } from './dto/update-fields.dto';

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
  async getPlayerMatchupBetById(id: string): Promise<PlayerMatchupBet> {
    const found = await this.playerMatcupBetRepository.findOne({
      where: {
        id,
      },
      relations: ['guesses', 'guesses.createdBy'],
    });
    if (!found) {
      this.logger.error(`PlayerMatchupBet with ID ${id} not found.`);
      throw new NotFoundException(`PlayerMatchupBet with ID ${id} not found.`);
    }
    return found;
  }

  async updateResult(
    updateResultDto: UpdateResultDto,
    id: string,
  ): Promise<PlayerMatchupBet> {
    const bet = await this.getPlayerMatchupBetById(id);
    bet.result = updateResultDto.result;
    try {
      const savedBet = await this.playerMatcupBetRepository.save(bet);
      this.logger.verbose(`Bet with ID "${id}" successfully updated.`);
      return savedBet;
    } catch (error) {
      this.logger.error(`Failed to update bet with ID: "${id}".`, error.stack);
      throw error;
    }
  }

  async updateFields(
    updateFieldsDto: UpdateFieldsDto,
    id: string,
  ): Promise<PlayerMatchupBet> {
    const bet = await this.getPlayerMatchupBetById(id);
    Object.assign(bet, updateFieldsDto);

    try {
      const savedBet = await this.playerMatcupBetRepository.save(bet);
      this.logger.verbose(
        `Bet with ID "${id}" successfully updated the fields.`,
      );
      return savedBet;
    } catch (error) {
      this.logger.error(
        `Failed to update bet fields with ID: "${id}".`,
        error.stack,
      );
      throw error;
    }
  }
}
