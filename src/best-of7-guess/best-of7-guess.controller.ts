import {
  Body,
  Controller,
  Get,
  Logger,
  Param,
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
}
