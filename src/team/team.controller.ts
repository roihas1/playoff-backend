import { Controller, Logger, Post, UseGuards } from '@nestjs/common';
import { TeamService } from './team.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { Roles } from 'src/auth/roles.decorator';
import { RolesGuard } from 'src/auth/roles.guard';
import { Role } from 'src/auth/user-role.enum';
import { GetUser } from 'src/auth/get-user.decorator';
import { User } from 'src/auth/user.entity';

@Controller('teams')
@UseGuards(JwtAuthGuard)
export class TeamController {
  private logger = new Logger('TeamController', { timestamp: true });

  constructor(private teamService: TeamService) {}

  @Post('sync')
  @Roles(Role.ADMIN)
  @UseGuards(RolesGuard)
  async syncFromPython(
    @GetUser() user: User,
  ): Promise<{ synced: number; created: number; updated: number }> {
    this.logger.verbose(
      `User "${user.username}" triggering team sync from Python service.`,
    );
    const { created, updated } =
      await this.teamService.syncTeamsFromPythonService();
    const synced = created + updated;
    this.logger.verbose(
      `Team sync completed: ${synced} total (${created} created, ${updated} updated).`,
    );
    return { synced, created, updated };
  }
}
