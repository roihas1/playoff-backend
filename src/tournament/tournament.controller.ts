import {
  Body,
  Controller,
  Get,
  Logger,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { TournamentService } from './tournament.service';
import { Tournament } from './tournament.entity';
import { GetUser } from 'src/auth/get-user.decorator';
import { User } from 'src/auth/user.entity';
import { CreateTournamentDto } from './dto/create-tournament.dto';

@Controller('tournament')
@UseGuards(JwtAuthGuard)
export class TournamentController {
  private logger = new Logger('TournamentController', { timestamp: true });

  constructor(private tournamentService: TournamentService) {}

  @Post()
  async createTournament(
    @Body() createTournamentDto: CreateTournamentDto,
    @GetUser() user: User,
  ): Promise<Tournament> {
    this.logger.verbose(
      `User: ${user.username} attempting to create tournament: ${createTournamentDto.name}`,
    );
    return await this.tournamentService.createTournament(createTournamentDto);
  }

  @Get()
  async getAllTournaments(@GetUser() user: User): Promise<Tournament[]> {
    this.logger.verbose(
      `User: ${user.username} attempting to get all tournaments`,
    );
    return await this.tournamentService.getAllTournaments();
  }

  @Get(':id')
  async getTournamentById(
    @Param('id') id: string,
    @GetUser() user: User,
  ): Promise<Tournament> {
    this.logger.verbose(
      `User: ${user.username} attempting to get tournament: ${id}`,
    );
    return await this.tournamentService.getTournamentById(id);
  }
}
