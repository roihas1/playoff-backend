import { Body, Controller, Logger, Post, UseGuards } from '@nestjs/common';
import { ChampionsGuessService } from './champions-guess.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { ChampionTeamGuess } from './entities/champion-team-guess.entity';
import { ConferenceFinalGuess } from './entities/conference-final-guess.entity';
import { MVPGuess } from './entities/mvp-guess.entity';
import { CreateChampGuessDto } from './dto/create-champ-guess.dto';
import { GetUser } from 'src/auth/get-user.decorator';
import { User } from 'src/auth/user.entity';
import { UpdateChamionGuessDto } from './dto/update-champ-guess.dto';

@Controller('champions-guess')
@UseGuards(JwtAuthGuard)
export class ChampionsGuessController {
  private logger = new Logger('ChampionsGuessController', { timestamp: true });
  constructor(private champGuessService: ChampionsGuessService) {}

  @Post('/update/beforePlayoffs')
  async createChampionsGuess(
    @Body() createChampGuessDto: CreateChampGuessDto,
    @GetUser() user: User,
  ): Promise<{
    champTeam: ChampionTeamGuess;
    confrenceGuess: ConferenceFinalGuess[];
    mvpGuess: MVPGuess;
  }> {
    this.logger.verbose(`User ${user.username} creating his champ guesses.`);
    return await this.champGuessService.createChampionsGuess(
      createChampGuessDto,
      user,
    );
  }

  // for stage - round 1, round 2
  @Post('/update/afterFirstRound')
  async updateChampionGuess(
    @Body() updateChampionGuessDto: UpdateChamionGuessDto,
    @GetUser() user: User,
  ): Promise<{
    champTeamGuess: ChampionTeamGuess;
    MVPGuess: MVPGuess;
  }> {
    this.logger.verbose(
      `User ${user.username} updating his champ guesses for stage ${updateChampionGuessDto.stage}.`,
    );
    return await this.champGuessService.updateChampionGuess(
      updateChampionGuessDto,
      user,
    );
  }
}
