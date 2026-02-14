import { Injectable, Logger } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Team } from './team.entity';

@Injectable()
export class TeamRepository extends Repository<Team> {
  private logger = new Logger('TeamRepository', { timestamp: true });

  constructor(dataSource: DataSource) {
    super(Team, dataSource.createEntityManager());
  }

  async findById(id: string): Promise<Team | null> {
    return this.findOne({ where: { id } });
  }

  async findByAbbreviation(abbreviation: string): Promise<Team | null> {
    return this.findOne({
      where: { abbreviation: abbreviation.trim().toUpperCase() },
    });
  }

  async findByNameOrAbbreviation(nameOrAbbrev: string): Promise<Team | null> {
    const normalized = nameOrAbbrev.trim();
    const upper = normalized.toUpperCase();
    return this.findOne({
      where: [{ name: normalized }, { abbreviation: upper }],
    });
  }

  async findAllActive(): Promise<Team[]> {
    return this.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });
  }
}
