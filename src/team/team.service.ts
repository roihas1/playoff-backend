import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { TeamRepository } from './team.repository';
import { Team } from './team.entity';
import { Conference } from '../series/conference.enum';
import {
  PythonTeamResponseItem,
  PythonTeamsResponse,
} from './dto/python-team-response.dto';

@Injectable()
export class TeamService {
  private logger = new Logger('TeamService', { timestamp: true });
  private readonly pythonUrl =
    process.env.PYTHON_SERVICE_URL ?? 'http://127.0.0.1:8000';
  private readonly pythonTeamsPath =
    process.env.PYTHON_TEAMS_PATH ?? '/api/teams/teams';

  constructor(
    private teamRepository: TeamRepository,
    private readonly httpService: HttpService,
  ) {}

  async findById(id: string): Promise<Team> {
    const team = await this.teamRepository.findById(id);
    if (!team) {
      this.logger.error(`Team with ID "${id}" not found.`);
      throw new NotFoundException(`Team with ID "${id}" not found.`);
    }
    return team;
  }

  async findByIdOrNull(id: string): Promise<Team | null> {
    return this.teamRepository.findById(id);
  }

  async findByAbbreviation(abbreviation: string): Promise<Team | null> {
    return this.teamRepository.findByAbbreviation(abbreviation);
  }

  async findByNameOrAbbreviation(nameOrAbbrev: string): Promise<Team | null> {
    return this.teamRepository.findByNameOrAbbreviation(nameOrAbbrev);
  }

  async findByNameOrAbbreviationOrThrow(nameOrAbbrev: string): Promise<Team> {
    const team =
      await this.teamRepository.findByNameOrAbbreviation(nameOrAbbrev);
    if (!team) {
      throw new BadRequestException(
        `Team with name or abbreviation "${nameOrAbbrev}" not found.`,
      );
    }
    return team;
  }

  async findAllActive(): Promise<Team[]> {
    return this.teamRepository.findAllActive();
  }

  async ensureTeamsExistAndDistinct(
    team1Id: string,
    team2Id: string,
  ): Promise<void> {
    if (team1Id === team2Id) {
      throw new BadRequestException('team1Id and team2Id must be distinct.');
    }
    const [team1, team2] = await Promise.all([
      this.teamRepository.findById(team1Id),
      this.teamRepository.findById(team2Id),
    ]);
    if (!team1) {
      throw new BadRequestException(`Team with ID "${team1Id}" not found.`);
    }
    if (!team2) {
      throw new BadRequestException(`Team with ID "${team2Id}" not found.`);
    }
  }

  async syncTeamsFromPythonService(): Promise<{
    created: number;
    updated: number;
  }> {
    const url = `${this.pythonUrl}${this.pythonTeamsPath}`;
    this.logger.log(`Fetching teams from Python service: ${url}`);

    let data: PythonTeamResponseItem[];
    try {
      const response = await firstValueFrom(this.httpService.get(url));
      const body = response.data as PythonTeamsResponse | undefined;
      data = body?.teams && Array.isArray(body.teams) ? body.teams : [];
    } catch (error: any) {
      this.logger.error(
        `Python service error: ${error?.message ?? error}`,
        error?.stack,
      );
      throw error;
    }

    let created = 0;
    let updated = 0;

    for (const item of data) {
      const id = item.id && String(item.id).trim() ? String(item.id) : null;
      if (!id) continue;

      const name = item.name ?? '';
      const city = item.city ?? '';
      const abbreviation = item.abbreviation ?? id;
      const conference = this.mapConference(item.conference);
      const isActive = item.isActive ?? true;

      const existing = await this.teamRepository.findById(id);
      if (existing) {
        existing.name = name;
        existing.city = city;
        existing.abbreviation = abbreviation;
        existing.conference = conference;
        existing.isActive = isActive;
        await this.teamRepository.save(existing);
        updated++;
      } else {
        const team = this.teamRepository.create({
          id,
          name,
          city,
          abbreviation,
          conference,
          isActive,
        });
        await this.teamRepository.save(team);
        created++;
      }
    }

    this.logger.log(`Sync complete: ${created} created, ${updated} updated.`);
    return { created, updated };
  }

  private mapConference(conference?: string): Conference {
    if (!conference) return Conference.EAST;
    const normalized = conference.trim().toLowerCase();
    if (normalized === 'west') return Conference.WEST;
    if (normalized === 'east') return Conference.EAST;
    return Conference.EAST;
  }
}
