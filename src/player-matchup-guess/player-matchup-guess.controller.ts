import { Body, Controller, Logger, Param, Patch, Post } from '@nestjs/common';
import { PlayerMatchupGuessService } from './player-matchup-guess.service';
import { CreatePlayerMatchupGuessDto } from './dto/create-player-matchup-guess.dto';
import { GetUser } from 'src/auth/get-user.decorator';
import { PlayerMatchupGuess } from './player-matchup-guess.entity';
import { User } from 'src/auth/user.entity';
import { UpdateGuessDto } from './dto/update-guess.dto';

@Controller('player-matchup-guess')
export class PlayerMatchupGuessController {
  private logger = new Logger('PlayerMatchupGuessController', {
    timestamp: true,
  });
  constructor(private playerMatchupGuessService: PlayerMatchupGuessService) {}

  @Post()
  async createPlayerMatchGuess(
    @Body() createPlayerMatchGuessDto: CreatePlayerMatchupGuessDto,
    @GetUser() user: User,
  ): Promise<PlayerMatchupGuess> {
    this.logger.verbose(
      `User "${user.username}" creating new PlayerMatchupGuess. Data: ${JSON.stringify(createPlayerMatchGuessDto)}.`,
    );
    return await this.playerMatchupGuessService.createPlayerMatchupGuess(
      createPlayerMatchGuessDto,
      user,
    );
  }

  @Patch('/:id')
  async updateGuess(
    @Param('id') id: string,
    @Body() updateGuessDto: UpdateGuessDto,
    @GetUser() user: User,
  ): Promise<PlayerMatchupGuess> {
    this.logger.verbose(
      `User "${user.username}" attempt to update PlayerMatchupGuess with ID: ${id}.`,
    );
    const newGuess = await this.playerMatchupGuessService.updateGuess(
      id,
      updateGuessDto,
    );
    this.logger.verbose(`Guess with ID "${id}" successfully updated.`);
    return newGuess;
  }
}
