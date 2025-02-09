import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { SpontaneousBetRepo } from './spontaneous-bet.repository';
import { SpontaneousBet } from './spontaneousBet.entity';
import { CreateSpontaneousBetDto } from './dto/create-spontaneous-bet.dto';

@Injectable()
export class SpontaneousBetService {
  private logger = new Logger('SpontaneousBetService', { timestamp: true });
  constructor(private spontaneousBetRepo: SpontaneousBetRepo) {}

  async createSpontaneousBet(
    createSpontaneousBetDto: CreateSpontaneousBetDto,
  ): Promise<SpontaneousBet> {
    try {
      const bet = await this.spontaneousBetRepo.createSpontaneousBet(
        createSpontaneousBetDto,
      );
      this.logger.verbose(`Spontaneous bet created.`);
      return bet;
    } catch (error) {
      this.logger.error(`Failed to create new spontaneous Bet ${error.stack}`);
      throw new InternalServerErrorException(
        `Failed to create new spontaneous Bet`,
      );
    }
  }
  async getAllSeriesSpontaneousBets(
    seriesId: string,
  ): Promise<SpontaneousBet[]> {
    try {
      const bets =
        await this.spontaneousBetRepo.getAllSeriesSpontaneousBets(seriesId);
      return bets;
    } catch (error) {
      this.logger.error(
        `Failed to get all spontaneous Bets for series:${seriesId},  ${error.stack}`,
      );
      throw new InternalServerErrorException(
        `Failed to get all spontaneous Bets for series:${seriesId}`,
      );
    }
  }

  async getBetById(betId: string): Promise<SpontaneousBet> {
    try {
      const found = await this.spontaneousBetRepo.findOne({
        where: { id: betId },
        relations: ['guesses', 'guesses.createdBy', 'guesses', 'guesses.bet'],
      });
      if (!found) {
        this.logger.error(`SpontaneousBet with ID ${betId} not found.`);
        throw new NotFoundException(
          `PlayerMatchupBet with ID ${betId} not found.`,
        );
      }
      return found;
    } catch (error) {
      this.logger.error(`Failed to get spontaneous bet. ${error.stack}`);
      throw new InternalServerErrorException(`Failed to get spontaneous bet.`);
    }
  }
  async updateBetFields(updateBetFieldsDto, betId): Promise<SpontaneousBet> {
    try {
      const bet = await this.spontaneousBetRepo.findOne({
        where: { id: betId },
      });

      Object.assign(bet, updateBetFieldsDto);

      const savedBet = await this.spontaneousBetRepo.save(bet);
      this.logger.verbose(
        `Spontaneoues bet with ID "${betId}" successfully updated the fields.`,
      );
      return savedBet;
    } catch (error) {
      this.logger.error(
        `Failed to update fields to  spontaneous bet. ${error.stack}`,
      );
      throw new InternalServerErrorException(
        `Failed to update fields to  spontaneous bet.`,
      );
    }
  }
  async deleteBet(id: string): Promise<void> {
    try {
      const bet = await this.getBetById(id);
      if (!bet) {
        // If the bet does not exist, log and throw an error
        this.logger.error(`Spontaneous Bet with ID: "${id}" not found.`);
        throw new NotFoundException(
          `Spontaneous Bet with ID: "${id}" not found.`,
        );
      }
      await this.spontaneousBetRepo.delete(id);
      this.logger.verbose(`Successfully deleted bet with ID: "${id}"`);
      return;
    } catch (error) {
      this.logger.error(`Failed to delete spontaneous bet. ${error.stack}`);
      throw new InternalServerErrorException(
        `Failed to delete spontaneous bet.`,
      );
    }
  }
}
