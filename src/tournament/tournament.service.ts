import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { TournamentRepository } from './tournament.repository';
import { Tournament } from './tournament.entity';
import { CreateTournamentDto } from './dto/create-tournament.dto';

@Injectable()
export class TournamentService {
  private logger = new Logger('TournamentService', { timestamp: true });

  constructor(private tournamentRepository: TournamentRepository) {}

  async findAll(): Promise<Tournament[]> {
    return this.tournamentRepository.findAll();
  }

  async findOne(id: string): Promise<Tournament> {
    const tournament = await this.tournamentRepository.findOne({
      where: { id },
    });
    if (!tournament) {
      this.logger.error(`Tournament with ID "${id}" not found.`);
      throw new NotFoundException(`Tournament with ID "${id}" not found.`);
    }
    return tournament;
  }

  async create(createTournamentDto: CreateTournamentDto): Promise<Tournament> {
    return this.tournamentRepository.createTournament(createTournamentDto);
  }
}
