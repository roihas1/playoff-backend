import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { BestOf7GuessService } from './best-of7-guess.service';
import { CreateBestOf7GuessDto } from './dto/create-best-of7-guess.dto';
import { GetUser } from 'src/auth/get-user.decorator';
import { User } from 'src/auth/user.entity';
import { BestOf7Guess } from './best-of7-guess.entity';

@Controller('best-of7-guess')
@UseGuards(AuthGuard())
export class BestOf7GuessController {
  private logger = new Logger('BestOf7GuessController', { timestamp: true });
  constructor(private bestOf7GuessService: BestOf7GuessService) {}

  @Post()
  async createBestOf7Guess(
    @Body() createBestOf7GuessDto: CreateBestOf7GuessDto,
    @GetUser() user: User,
  ): Promise<BestOf7Guess> {
    this.logger.verbose(
      `User "${user.username}" creating new BestOf7Guess. Data: ${JSON.stringify(createBestOf7GuessDto)}.`,
    );
    return await this.bestOf7GuessService.createBestOf7Guess(
      createBestOf7GuessDto,
      user,
    );
  }

  @Get('/:guessId')
  async getGuessById(
    @Param('guessId') id: string,
    @GetUser() user: User,
  ): Promise<BestOf7Guess> {
    this.logger.verbose(
      `User "${user.username}" try to retrieve BestOf7Guess with ID: ${id}.`,
    );
    return await this.bestOf7GuessService.getGuessById(id);
  }

  @Patch('/:id/:guess')
  async updateGuess(
    @Param('id') id: string,
    @Param('guess') guess: number,
    @GetUser() user: User,
  ): Promise<BestOf7Guess> {
    this.logger.verbose(
      `User "${user.username}" attempt to update BestOf7Guess with ID: ${id}.`,
    );
    const newGuess = await this.bestOf7GuessService.updateGuess(id, guess);
    this.logger.verbose(`Guess with ID "${id}" successfully updated.`);
    return newGuess;
  }

  @Delete('/:id')
  async deleteGuess(
    @Param('id') id: string,
    @GetUser() user: User,
  ): Promise<void> {
    this.logger.verbose(
      `User "${user.username}" attempt to delete BestOf7Guess with ID: ${id}.`,
    );
    return await this.bestOf7GuessService.deleteGuess(id);
  }
}
