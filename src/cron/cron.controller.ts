import { Controller, HttpCode, HttpStatus, Logger, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { Roles } from 'src/auth/roles.decorator';
import { RolesGuard } from 'src/auth/roles.guard';
import { Role } from 'src/auth/user-role.enum';
import { NbaSyncCronService } from './nba-sync.cron.service';

@Controller('admin/nba-sync')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class CronController {
  private readonly logger = new Logger('CronController', { timestamp: true });

  constructor(private readonly nbaSyncCronService: NbaSyncCronService) {}

  @Post('trigger')
  @HttpCode(HttpStatus.OK)
  async triggerNbaSync(): Promise<{ message: string }> {
    this.logger.log('Manual NBA sync triggered via admin endpoint.');
    await this.nbaSyncCronService.handleDailyNbaSync();
    return { message: 'NBA sync completed. Check server logs for details.' };
  }
}
