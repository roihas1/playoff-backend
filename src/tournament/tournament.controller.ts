import {
  Body,
  Controller,
  Get,
  Logger,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { TournamentService } from './tournament.service';
import { Tournament } from './tournament.entity';
import { CreateTournamentDto } from './dto/create-tournament.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { Roles } from 'src/auth/roles.decorator';
import { RolesGuard } from 'src/auth/roles.guard';
import { Role } from 'src/auth/user-role.enum';
import { GetUser } from 'src/auth/get-user.decorator';
import { User } from 'src/auth/user.entity';

@Controller('tournaments')
@UseGuards(JwtAuthGuard)
export class TournamentController {
  private logger = new Logger('TournamentController', { timestamp: true });

  constructor(private tournamentService: TournamentService) {}

  @Get()
  async findAll(@GetUser() user: User): Promise<Tournament[]> {
    this.logger.verbose(
      `User "${user.username}" attempting to retrieve all tournaments.`,
    );
    return this.tournamentService.findAll();
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @GetUser() user: User,
  ): Promise<Tournament> {
    this.logger.verbose(
      `User "${user.username}" retrieving tournament with id: ${id}.`,
    );
    return this.tournamentService.findOne(id);
  }

  @Post()
  @Roles(Role.ADMIN)
  @UseGuards(RolesGuard)
  async create(
    @Body() createTournamentDto: CreateTournamentDto,
    @GetUser() user: User,
  ): Promise<Tournament> {
    this.logger.verbose(
      `User "${user.username}" creating new tournament. Data: ${JSON.stringify(createTournamentDto)}.`,
    );
    return this.tournamentService.create(createTournamentDto);
  }
}
