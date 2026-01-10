import {
  Injectable,
  Logger,
  NotFoundException,
  InternalServerErrorException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateTournamentDto } from './dto/create-tournament.dto';
import { Tournament } from './tournament.entity';

@Injectable()
export class TournamentService {
  private logger = new Logger('TournamentService', { timestamp: true });

  constructor(
    @InjectRepository(Tournament)
    private tournamentRepository: Repository<Tournament>,
  ) {}

  async createTournament(
    createTournamentDto: CreateTournamentDto,
  ): Promise<Tournament> {
    try {
      // Check if tournament with same name exists
      const existing = await this.tournamentRepository.findOne({
        where: { name: createTournamentDto.name },
      });

      if (existing) {
        throw new ConflictException('Tournament with this name already exists');
      }

      const tournament = this.tournamentRepository.create(createTournamentDto);
      const saved = await this.tournamentRepository.save(tournament);

      this.logger.verbose(`Tournament "${saved.name}" created successfully.`);
      return saved;
    } catch (error) {
      if (error instanceof ConflictException) throw error;

      this.logger.error('Failed to create tournament', error.stack);
      throw new InternalServerErrorException('Failed to create tournament');
    }
  }

  async getAllTournaments(): Promise<Tournament[]> {
    try {
      return await this.tournamentRepository.find();
    } catch (error) {
      this.logger.error('Failed to get tournaments', error.stack);
      throw new InternalServerErrorException('Failed to get tournaments');
    }
  }

  async getTournamentById(id: string): Promise<Tournament> {
    const tournament = await this.tournamentRepository.findOne({
      where: { id },
    });

    if (!tournament) {
      throw new NotFoundException(`Tournament with id ${id} not found`);
    }

    return tournament;
  }
}
