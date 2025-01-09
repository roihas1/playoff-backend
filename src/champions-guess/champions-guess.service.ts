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
    const conferenceFinalGuess = this.conferenceFinalGuessRepo.create({
      createdBy: user,
      team1,
      team2,
      conference,
      fantasyPoints,
      stage,
    });
    try {
      return await this.conferenceFinalGuessRepo.save(conferenceFinalGuess);
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
        mvpGuess.fantasyPoints,
      );
      const champTeamNewGuess = await this.createChampTeamGuess(
        champTeamGuess.team,
        playoffsStage,
        user,
        champTeamGuess.fantasyPoints,
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
}
