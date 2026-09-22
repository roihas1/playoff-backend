import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { TournamentRepository } from './tournament.repository';
import { Tournament } from './tournament.entity';
import { CreateTournamentDto } from './dto/create-tournament.dto';
import { AppCacheService } from 'src/memory-cache/app-cache.service';

@Injectable()
export class TournamentService {
  private logger = new Logger('TournamentService', { timestamp: true });

  constructor(
    private tournamentRepository: TournamentRepository,
    private readonly appCache: AppCacheService,
  ) {}

  async findAll(): Promise<Tournament[]> {
    const key = this.appCache.buildPublicKey('tournaments/all', {});
    return this.appCache.wrap(key, () => this.tournamentRepository.findAll());
  }

  async findOne(id: string): Promise<Tournament> {
    const key = this.appCache.buildPublicKey('tournaments/detail', {
      tournamentId: id,
    });
    return this.appCache.wrap(key, async () => {
      const tournament = await this.tournamentRepository.findOne({
        where: { id },
      });
      if (!tournament) {
        this.logger.error(`Tournament with ID "${id}" not found.`);
        throw new NotFoundException(`Tournament with ID "${id}" not found.`);
      }
      return tournament;
    });
  }

  async create(createTournamentDto: CreateTournamentDto): Promise<Tournament> {
    const created =
      await this.tournamentRepository.createTournament(createTournamentDto);
    await this.appCache.delByPrefix('p:v1:tournaments:');
    return created;
  }
}
