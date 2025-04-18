import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { ConferenceFinalGuess } from './entities/conference-final-guess.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/auth/user.entity';
import { CreateChampGuessDto } from './dto/create-champ-guess.dto';
import { ChampionTeamGuess } from './entities/champion-team-guess.entity';
import { MVPGuess } from './entities/mvp-guess.entity';
import { PlayoffStage } from 'src/playoffs-stage/playoffs-stage.entity';
import { PlayoffsStageService } from 'src/playoffs-stage/playoffs-stage.service';
import { Conference } from 'src/series/conference.enum';
import { UpdateChamionGuessDto } from './dto/update-champ-guess.dto';
import { AuthService } from 'src/auth/auth.service';

@Injectable()
export class ChampionsGuessService {
  private logger = new Logger('ChampionsGuessService', { timestamp: true });
  constructor(
    @InjectRepository(ConferenceFinalGuess)
    private conferenceFinalGuessRepo: Repository<ConferenceFinalGuess>,
    @InjectRepository(ChampionTeamGuess)
    private championTeamGuessRepo: Repository<ChampionTeamGuess>,
    @InjectRepository(MVPGuess)
    private mvpGuessRepository: Repository<MVPGuess>,
    private playoffsStageService: PlayoffsStageService,
    private usersService: AuthService,
  ) {}

  private async createChampTeamGuess(
    team: string,
    stage: PlayoffStage,
    user: User,
    fantasyPoints?: number,
  ): Promise<ChampionTeamGuess> {
    try {
      const found = await this.championTeamGuessRepo.findOne({
        where: {
          stage,
          createdBy: user,
        },
      });
      if (!found) {
        const teamguess = this.championTeamGuessRepo.create({
          createdBy: user,
          team,
          fantasyPoints,
          stage,
        });

        return await this.championTeamGuessRepo.save(teamguess);
      }
      found.team = team;
      return await this.championTeamGuessRepo.save(found);
    } catch (error) {
      if (error.code == '23505') {
        this.logger.error(
          `User ${user.username} failed to create new champ team guess to stage ${stage.name} because he already guessed.`,
        );
        throw new InternalServerErrorException(
          `User ${user.username} failed to create new champ team guess to stage ${stage.name} because he already guessed.`,
        );
      }
      this.logger.error(
        `User ${user.username} failed to create new champ team guess to stage ${stage.name}`,
      );
      throw new InternalServerErrorException(
        `User ${user.username} failed to create new champ team guess to stage ${stage.name}`,
      );
    }
  }
  private async createConferenceFinalGuess(
    user: User,
    team1: string,
    team2: string,
    conference: Conference,
    fantasyPoints: number,
    stage: PlayoffStage,
  ): Promise<ConferenceFinalGuess> {
    try {
      const found = await this.conferenceFinalGuessRepo.findOne({
        where: {
          createdBy: user,
          stage,
          conference,
        },
      });
      if (!found) {
        const conferenceFinalGuess = this.conferenceFinalGuessRepo.create({
          createdBy: user,
          team1,
          team2,
          conference,
          fantasyPoints,
          stage,
        });

        return await this.conferenceFinalGuessRepo.save(conferenceFinalGuess);
      }
      found.team1 = team1;
      found.team2 = team2;
      return await this.conferenceFinalGuessRepo.save(found);
    } catch (error) {
      this.logger.error(
        `User ${user.username} failed to create new conference Final Guess to stage ${stage.name} ${error}`,
      );
      throw new InternalServerErrorException(
        `User ${user.username} failed to create new conference Final Guess to stage ${stage.name}`,
      );
    }
  }
  private async createMvpGuess(
    player: string,
    stage: PlayoffStage,
    user: User,
    fantasyPoints?: number,
  ): Promise<MVPGuess> {
    try {
      const found = await this.mvpGuessRepository.findOne({
        where: { createdBy: user, stage },
      });

      if (!found) {
        const mvpGuess = this.mvpGuessRepository.create({
          createdBy: user,
          player,
          fantasyPoints,
          stage,
        });
        return await this.mvpGuessRepository.save(mvpGuess);
      } else {
        found.player = player;
        return await this.mvpGuessRepository.save(found);
      }
    } catch (error) {
      this.logger.error(
        `User ${user.username} failed to create new MVP Guess to stage ${stage.name}`,
      );
      throw new InternalServerErrorException(
        `User ${user.username} failed to create new MVP Guess to stage ${stage.name}`,
      );
    }
  }

  async createChampionsGuess(
    createChampGuessDto: CreateChampGuessDto,
    user: User,
  ): Promise<{
    champTeam: ChampionTeamGuess;
    confrenceGuess: ConferenceFinalGuess[];
    mvpGuess: MVPGuess;
  }> {
    const { champTeamGuess, conferenceFinalGuess, mvpGuess, stage } =
      createChampGuessDto;
    try {
      const playoffsStage = await this.playoffsStageService.createPlayoffsStage(
        { name: stage },
        user,
      );
      const champTeamNewGuess = await this.createChampTeamGuess(
        champTeamGuess.team,
        playoffsStage,
        user,
        champTeamGuess.fantasyPoints,
      );
      const createdConferenceFinalGuesses: ConferenceFinalGuess[] =
        await Promise.all(
          conferenceFinalGuess.map(async (guess) => {
            return await this.createConferenceFinalGuess(
              user,
              guess.team1,
              guess.team2,
              guess.conference,
              guess.fantasyPoints,
              playoffsStage,
            );
          }),
        );

      const newMVPGuess = await this.createMvpGuess(
        mvpGuess.player,

        playoffsStage,
        user,
        mvpGuess.fantasyPoints,
      );
      return {
        champTeam: champTeamNewGuess,
        confrenceGuess: createdConferenceFinalGuesses,
        mvpGuess: newMVPGuess,
      };
    } catch (error) {
      this.logger.error('Error updating champion guesses:', error);
      throw new Error(
        'Failed to update champion guesses. Please try again later.',
      );
    }
  }
  async updateChampionGuess(
    updateChampionGuessDto: UpdateChamionGuessDto,
    user: User,
  ): Promise<{
    champTeamGuess: ChampionTeamGuess;
    MVPGuess: MVPGuess;
  }> {
    const { champTeamGuess, mvpGuess, stage, deadline } =
      updateChampionGuessDto;
    try {
      const playoffsStage = await this.playoffsStageService.createPlayoffsStage(
        { name: stage, startDate: deadline },
        user,
      );
      const newMVPGuess = await this.createMvpGuess(
        mvpGuess.player,
        playoffsStage,
        user,
        2,
      );
      const champTeamNewGuess = await this.createChampTeamGuess(
        champTeamGuess.team,
        playoffsStage,
        user,
        4,
      );
      return {
        champTeamGuess: champTeamNewGuess,
        MVPGuess: newMVPGuess,
      };
    } catch (error) {
      this.logger.error('Error updating champion guesses:', error);
      throw new Error(
        'Failed to update champion guesses. Please try again later.',
      );
    }
  }
  checkChampionTeamPointsForUser(
    championTeam: string,
    guesses: ChampionTeamGuess[],
  ): number {
    let fantasyPoints = 0;
    guesses.forEach((guess) => {
      fantasyPoints += guess.team === championTeam ? guess.fantasyPoints : 0;
    });
    return fantasyPoints;
  }
  checkMVPPointsForUser(mvp: string, guesses: MVPGuess[]): number {
    let fantasyPoints = 0;
    guesses.forEach((guess) => {
      fantasyPoints += guess.player === mvp ? guess.fantasyPoints : 0;
    });
    return fantasyPoints;
  }

  checkPointsForUser(
    conferenceFinalResult: string[],
    conferenceFinalGuesses: ConferenceFinalGuess[],
    userId: string,
  ): number {
    let fantasyPoints = 0;
    const userGuess = conferenceFinalGuesses.filter(
      (guess) => guess.createdBy.id === userId,
    )[0];
    if (userGuess) {
      if (
        (userGuess.team1 === conferenceFinalResult[0] &&
          userGuess.team2 === conferenceFinalResult[1]) ||
        (userGuess.team2 === conferenceFinalResult[0] &&
          userGuess.team1 === conferenceFinalResult[1])
      ) {
        fantasyPoints = userGuess.conference === Conference.FINALS ? 12 : 10;
      } else if (
        userGuess.team1 === conferenceFinalResult[0] ||
        userGuess.team1 === conferenceFinalResult[1] ||
        userGuess.team2 === conferenceFinalResult[0] ||
        userGuess.team2 === conferenceFinalResult[1]
      ) {
        fantasyPoints = userGuess.conference === Conference.FINALS ? 5 : 4;
      }
    }

    return fantasyPoints;
  }

  async updatePointsConferenceFinalsForUser(
    conferenceFinalResult: string[],
    guesses: ConferenceFinalGuess[],
  ): Promise<void> {
    let fantasyPoints = 0;
    await Promise.all(
      guesses.map(async (guess) => {
        if (
          (guess.team1 === conferenceFinalResult[0] &&
            guess.team2 === conferenceFinalResult[1]) ||
          (guess.team2 === conferenceFinalResult[0] &&
            guess.team1 === conferenceFinalResult[1])
        ) {
          fantasyPoints = guess.conference === Conference.FINALS ? 12 : 10;
        } else if (
          guess.team1 === conferenceFinalResult[0] ||
          guess.team1 === conferenceFinalResult[1] ||
          guess.team2 === conferenceFinalResult[0] ||
          guess.team2 === conferenceFinalResult[1]
        ) {
          fantasyPoints = guess.conference === Conference.FINALS ? 5 : 4;
        }
        await this.usersService.updateFantasyPoints(
          guess.createdBy,
          fantasyPoints,
        );
      }),
    );
  }
  async updatePointsForUserChampionTeam(
    championTeam: string,
    guesses: ChampionTeamGuess[],
  ): Promise<void> {
    await Promise.all(
      guesses.map(async (guess) => {
        if (guess.team === championTeam) {
          await this.usersService.updateFantasyPoints(
            guess.createdBy,
            guess.fantasyPoints,
          );
        }
      }),
    );
  }
  async updatePointsForUserMVP(
    mvp: string,
    guesses: MVPGuess[],
  ): Promise<void> {
    await Promise.all(
      guesses.map(async (guess) => {
        if (guess.player === mvp) {
          await this.usersService.updateFantasyPoints(
            guess.createdBy,
            guess.fantasyPoints,
          );
        }
      }),
    );
  }
  async hasChampionTeamGuess(
    stageName: string,
    userId: string,
  ): Promise<boolean> {
    const count = await this.championTeamGuessRepo.count({
      where: {
        stage: { name: stageName },
        createdBy: { id: userId },
      },
    });
    return count > 0;
  }

  async hasConferenceFinalGuess(
    stageName: string,
    userId: string,
  ): Promise<boolean> {
    const count = await this.conferenceFinalGuessRepo.count({
      where: {
        stage: { name: stageName },
        createdBy: { id: userId },
      },
    });
    return count > 0;
  }

  async hasMVPGuess(stageName: string, userId: string): Promise<boolean> {
    const count = await this.mvpGuessRepository.count({
      where: {
        stage: { name: stageName },
        createdBy: { id: userId },
      },
    });
    return count > 0;
  }

  async getMVPGuesses(): Promise<MVPGuess[]> {
    try {
      const guesses = await this.mvpGuessRepository
        .createQueryBuilder('guess')
        .leftJoin('guess.createdBy', 'createdBy')
        .leftJoin('guess.stage', 'stage')
        .select([
          'guess.id',
          'guess.player',
          'guess.fantasyPoints',
          'createdBy.id',
          'stage.id',
        ])
        .addSelect('createdBy.id', 'guess_createdBy_id')
        .addSelect('stage.id', 'guess_stage_id')
        .getMany();

      this.logger.verbose(`Retrieved ${guesses.length} MVP guesses.`);
      return guesses;
    } catch (error) {
      this.logger.error(
        `Failed to fetch MVP guesses: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Could not fetch MVP guesses');
    }
  }

  async getConferenceFinalGuesses(): Promise<ConferenceFinalGuess[]> {
    try {
      const guesses = await this.conferenceFinalGuessRepo
        .createQueryBuilder('guess')
        .leftJoin('guess.createdBy', 'createdBy')
        .leftJoin('guess.stage', 'stage')
        .select([
          'guess.id',
          'guess.team1',
          'guess.team2',
          'guess.conference',
          'guess.fantasyPoints',
          'createdBy.id',
          'stage.id',
        ])
        .getMany();

      this.logger.verbose(
        `Retrieved ${guesses.length} conference final guesses.`,
      );
      return guesses;
    } catch (error) {
      this.logger.error(
        `Failed to fetch conference final guesses: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Could not fetch conference final guesses',
      );
    }
  }

  async getChampionTeamGuesses(): Promise<ChampionTeamGuess[]> {
    try {
      const guesses = await this.championTeamGuessRepo
        .createQueryBuilder('guess')
        .leftJoin('guess.createdBy', 'createdBy')
        .leftJoin('guess.stage', 'stage')
        .select([
          'guess.id',
          'guess.team',
          'guess.fantasyPoints',
          'createdBy.id',
          'stage.id',
        ])
        .getMany();

      this.logger.verbose(`Retrieved ${guesses.length} champion team guesses.`);
      return guesses;
    } catch (error) {
      this.logger.error(
        `Failed to fetch champion team guesses: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Could not fetch champion team guesses',
      );
    }
  }
}
