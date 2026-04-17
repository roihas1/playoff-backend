import {
  BadRequestException,
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
import { UserTournamentPointsService } from 'src/user-tournament-points/user-tournament-points.service';
import { LEGACY_MIGRATION_TOURNAMENT_ID } from 'src/tournament/legacy-migration-tournament.constants';
import { TeamService } from 'src/team/team.service';

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
    private readonly userTournamentPointsService: UserTournamentPointsService,
    private readonly teamService: TeamService,
  ) {}

  private getErrorMetadata(error: unknown): {
    message: string;
    code?: string;
    detail?: string;
    stack?: string;
  } {
    if (error && typeof error === 'object') {
      const typedError = error as {
        message?: string;
        code?: string;
        detail?: string;
        stack?: string;
      };
      return {
        message: typedError.message ?? 'Unknown error',
        code: typedError.code,
        detail: typedError.detail,
        stack: typedError.stack,
      };
    }

    return { message: String(error) };
  }

  private async resolveTeamId(
    teamId?: string,
    teamName?: string,
    fieldLabel: string = 'team',
  ): Promise<string> {
    if (teamId) {
      return teamId;
    }

    if (!teamName) {
      throw new BadRequestException(
        `Missing ${fieldLabel}. Provide ${fieldLabel}Id or ${fieldLabel}.`,
      );
    }

    const foundTeam = await this.teamService.findByNameOrAbbreviationOrThrow(
      teamName,
    );
    return foundTeam.id;
  }

  private tournamentIdFromGuessStage(
    stage: { tournament?: { id: string } } | null | undefined,
  ): string {
    return stage?.tournament?.id ?? LEGACY_MIGRATION_TOURNAMENT_ID;
  }

  private async createChampTeamGuess(
    teamId: string,
    stage: PlayoffStage,
    user: User,
    fantasyPoints?: number,
  ): Promise<ChampionTeamGuess> {
    try {
      const found = await this.championTeamGuessRepo.findOne({
        where: {
          stage,
          createdBy: { id: user.id },
        },
      });
      if (!found) {
        const teamguess = this.championTeamGuessRepo.create({
          createdBy: user,
          teamRelation: { id: teamId } as any,
          fantasyPoints,
          stage,
        });

        return await this.championTeamGuessRepo.save(teamguess);
      }
      found.teamRelation = { id: teamId } as any;
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
    team1Id: string,
    team2Id: string,
    conference: Conference,
    fantasyPoints: number,
    stage: PlayoffStage,
  ): Promise<ConferenceFinalGuess> {
    try {
      const found = await this.conferenceFinalGuessRepo.findOne({
        where: {
          createdBy: { id: user.id },
          stage,
          conference,
        },
      });
      if (!found) {
        const conferenceFinalGuess = this.conferenceFinalGuessRepo.create({
          createdBy: user,
          team1Relation: { id: team1Id } as any,
          team2Relation: { id: team2Id } as any,
          conference,
          fantasyPoints,
          stage,
        });

        return await this.conferenceFinalGuessRepo.save(conferenceFinalGuess);
      }
      found.team1Relation = { id: team1Id } as any;
      found.team2Relation = { id: team2Id } as any;
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
        where: { createdBy: { id: user.id }, stage },
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
      const champTeamId = await this.resolveTeamId(
        champTeamGuess.teamId,
        champTeamGuess.team,
        'champTeam',
      );
      const playoffsStage = await this.playoffsStageService.createPlayoffsStage(
        { name: stage, tournamentId: createChampGuessDto.tournamentId },
        user,
      );
      const champTeamNewGuess = await this.createChampTeamGuess(
        champTeamId,
        playoffsStage,
        user,
        champTeamGuess.fantasyPoints,
      );
      const createdConferenceFinalGuesses: ConferenceFinalGuess[] =
        await Promise.all(
          conferenceFinalGuess.map(async (guess) => {
            const [team1Id, team2Id] = await Promise.all([
              this.resolveTeamId(guess.team1Id, guess.team1, 'team1'),
              this.resolveTeamId(guess.team2Id, guess.team2, 'team2'),
            ]);
            return await this.createConferenceFinalGuess(
              user,
              team1Id,
              team2Id,
              guess.conference,
              guess.fantasyPoints ?? 10,
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
      if (error instanceof BadRequestException) {
        throw error;
      }

      const errorData = this.getErrorMetadata(error);
      this.logger.error(
        `Error creating champion guesses for user ${user.username}: ${errorData.message}${
          errorData.code ? ` (code: ${errorData.code})` : ''
        }${errorData.detail ? ` (detail: ${errorData.detail})` : ''}`,
        errorData.stack,
      );
      throw new InternalServerErrorException(
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
      const champTeamId = await this.resolveTeamId(
        champTeamGuess.teamId,
        champTeamGuess.team,
        'champTeam',
      );
      const playoffsStage = await this.playoffsStageService.createPlayoffsStage(
        {
          name: stage,
          startDate: deadline,
          tournamentId: updateChampionGuessDto.tournamentId,
        },
        user,
      );
      const newMVPGuess = await this.createMvpGuess(
        mvpGuess.player,
        playoffsStage,
        user,
        2,
      );
      const champTeamNewGuess = await this.createChampTeamGuess(
        champTeamId,
        playoffsStage,
        user,
        4,
      );
      return {
        champTeamGuess: champTeamNewGuess,
        MVPGuess: newMVPGuess,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      const errorData = this.getErrorMetadata(error);
      this.logger.error(
        `Error updating champion guesses for user ${user.username}: ${errorData.message}${
          errorData.code ? ` (code: ${errorData.code})` : ''
        }${errorData.detail ? ` (detail: ${errorData.detail})` : ''}`,
        errorData.stack,
      );
      throw new InternalServerErrorException(
        'Failed to update champion guesses. Please try again later.',
      );
    }
  }
  checkChampionTeamPointsForUser(
    championTeamId: string,
    guesses: ChampionTeamGuess[],
  ): number {
    let fantasyPoints = 0;
    guesses.forEach((guess) => {
      fantasyPoints +=
        guess.teamRelation?.id === championTeamId ? guess.fantasyPoints : 0;
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
    const t1Id = userGuess?.team1Relation?.id;
    const t2Id = userGuess?.team2Relation?.id;
    const r0 = conferenceFinalResult[0];
    const r1 = conferenceFinalResult[1];
    if (userGuess && t1Id && t2Id && r0 && r1) {
      if ((t1Id === r0 && t2Id === r1) || (t2Id === r0 && t1Id === r1)) {
        fantasyPoints = userGuess.conference === Conference.FINALS ? 12 : 10;
      } else if (t1Id === r0 || t1Id === r1 || t2Id === r0 || t2Id === r1) {
        fantasyPoints = userGuess.conference === Conference.FINALS ? 5 : 4;
      }
    }

    return fantasyPoints;
  }

  async updatePointsConferenceFinalsForUser(
    conferenceFinalResult: string[],
    guesses: ConferenceFinalGuess[],
  ): Promise<void> {
    const r0 = conferenceFinalResult[0];
    const r1 = conferenceFinalResult[1];
    await Promise.all(
      guesses.map(async (guess) => {
        const t1Id = guess.team1Relation?.id;
        const t2Id = guess.team2Relation?.id;
        let fantasyPoints = 0;
        if (t1Id && t2Id && r0 && r1) {
          if ((t1Id === r0 && t2Id === r1) || (t2Id === r0 && t1Id === r1)) {
            fantasyPoints = guess.conference === Conference.FINALS ? 12 : 10;
          } else if (t1Id === r0 || t1Id === r1 || t2Id === r0 || t2Id === r1) {
            fantasyPoints = guess.conference === Conference.FINALS ? 5 : 4;
          }
        }
        if (fantasyPoints > 0) {
          await this.userTournamentPointsService.incrementFantasyPoints(
            guess.createdBy.id,
            this.tournamentIdFromGuessStage(guess.stage),
            fantasyPoints,
          );
        }
      }),
    );
  }
  async updatePointsForUserChampionTeam(
    championTeamId: string,
    guesses: ChampionTeamGuess[],
  ): Promise<void> {
    await Promise.all(
      guesses.map(async (guess) => {
        if (guess.teamRelation?.id === championTeamId) {
          await this.userTournamentPointsService.incrementFantasyPoints(
            guess.createdBy.id,
            this.tournamentIdFromGuessStage(guess.stage),
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
          await this.userTournamentPointsService.incrementFantasyPoints(
            guess.createdBy.id,
            this.tournamentIdFromGuessStage(guess.stage),
            guess.fantasyPoints,
          );
        }
      }),
    );
  }
  async hasChampionTeamGuess(
    stageName: string,
    userId: string,
    tournamentId: string = LEGACY_MIGRATION_TOURNAMENT_ID,
  ): Promise<boolean> {
    const count = await this.championTeamGuessRepo.count({
      where: {
        stage: { name: stageName, tournament: { id: tournamentId } },
        createdBy: { id: userId },
      },
    });
    return count > 0;
  }

  async hasConferenceFinalGuess(
    stageName: string,
    userId: string,
    tournamentId: string = LEGACY_MIGRATION_TOURNAMENT_ID,
  ): Promise<boolean> {
    const count = await this.conferenceFinalGuessRepo.count({
      where: {
        stage: { name: stageName, tournament: { id: tournamentId } },
        createdBy: { id: userId },
      },
    });
    return count > 0;
  }

  async hasMVPGuess(
    stageName: string,
    userId: string,
    tournamentId: string = LEGACY_MIGRATION_TOURNAMENT_ID,
  ): Promise<boolean> {
    const count = await this.mvpGuessRepository.count({
      where: {
        stage: { name: stageName, tournament: { id: tournamentId } },
        createdBy: { id: userId },
      },
    });
    return count > 0;
  }

  async getMVPGuesses(): Promise<MVPGuess[]> {
    try {
      const guesses = await this.mvpGuessRepository
        .createQueryBuilder('guess')
        .leftJoinAndSelect('guess.createdBy', 'createdBy')
        .leftJoinAndSelect('guess.stage', 'stage')
        .leftJoinAndSelect('stage.tournament', 'stageTournament')
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
        .leftJoinAndSelect('guess.createdBy', 'createdBy')
        .leftJoinAndSelect('guess.stage', 'stage')
        .leftJoinAndSelect('stage.tournament', 'stageTournament')
        .leftJoinAndSelect('guess.team1Relation', 'team1Relation')
        .leftJoinAndSelect('guess.team2Relation', 'team2Relation')
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
        .leftJoinAndSelect('guess.createdBy', 'createdBy')
        .leftJoinAndSelect('guess.stage', 'stage')
        .leftJoinAndSelect('stage.tournament', 'stageTournament')
        .leftJoinAndSelect('guess.teamRelation', 'teamRelation')
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
