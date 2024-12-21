import { Body, Controller, Logger, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { BestOf7BetService } from './best-of7-bet.service';
import { CreateBestOf7BetDto } from './dto/create-best-of7-bet.dto';
import { GetUser } from '../auth/get-user.decorator';
import { BestOf7Bet } from './bestOf7.entity';
import { User } from '../auth/user.entity';

@Controller('best-of7-bet')
@UseGuards(AuthGuard())
export class BestOf7BetController {
  private logger = new Logger('BestOf7BetController', { timestamp: true });
  constructor(private bestOf7BetService: BestOf7BetService) {}

  @Post()
  async createBestOf7Bet(
    @Body() createBestOf7Bet: CreateBestOf7BetDto,
    @GetUser() user: User,
  ): Promise<BestOf7Bet> {
    this.logger.verbose(
      `User "${user.username}" creating new BestOf7Bet. Data: ${JSON.stringify(createBestOf7Bet)}.`,
    );
    return await this.bestOf7BetService.createBestOf7Bet(createBestOf7Bet);
  }
}
