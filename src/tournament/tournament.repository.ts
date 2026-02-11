import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Tournament } from './tournament.entity';
import { CreateTournamentDto } from './dto/create-tournament.dto';

@Injectable()
export class TournamentRepository extends Repository<Tournament> {
  private logger = new Logger('TournamentRepository', { timestamp: true });

  constructor(dataSource: DataSource) {
    super(Tournament, dataSource.createEntityManager());
  }

  async createTournament(
    createTournamentDto: CreateTournamentDto,
  ): Promise<Tournament> {
    const { sportType, year, name } = createTournamentDto;
    const tournament = this.create({
      sportType,
      year,
      name,
    });
    try {
      const savedTournament = await this.save(tournament);
      this.logger.verbose(
        `Tournament "${savedTournament.name}" (${savedTournament.year}) created successfully.`,
      );
      return savedTournament;
    } catch (error) {
      this.logger.error(
        `Failed to create tournament "${tournament.name}".`,
        error.stack,
      );
      throw new InternalServerErrorException(
        `Failed to create tournament "${tournament.name}".`,
      );
    }
  }

  async findAll(): Promise<Tournament[]> {
    return this.find({
      order: { year: 'DESC', name: 'ASC' },
    });
  }
}
