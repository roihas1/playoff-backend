import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { SpontaneousBetService } from './spontaneous-bet.service';
import { CreateSpontaneousBetDto } from './dto/create-spontaneous-bet.dto';
import { SpontaneousBet } from './spontaneousBet.entity';
import { GetUser } from 'src/auth/get-user.decorator';
import { User } from 'src/auth/user.entity';
import { UpdateBetFieldsDto } from './dto/update-fields.dto';

@Controller('spontaneous-bet')
@UseGuards(JwtAuthGuard)
export class SpontaneousBetController {
  private logger = new Logger('SpontaneousBetController', {
    timestamp: true,
  });
  constructor(private spontaneousBetService: SpontaneousBetService) {}

  @Post()
  async createSpontaneousBet(
    @Body() createSpontaneousBetDto: CreateSpontaneousBetDto,
    @GetUser() user: User,
  ): Promise<SpontaneousBet> {
    this.logger.verbose(
      `User "${user.username}" creating new Spontaneous Bet. Data: ${JSON.stringify(createSpontaneousBetDto)}.`,
    );
    return await this.spontaneousBetService.createSpontaneousBet(
      createSpontaneousBetDto,
    );
  }

  @Get('/:seriesId')
  async getAllSeriesSpontaneousBets(
    @Param('seriesId') seriesId: string,
    @GetUser() user: User,
  ): Promise<SpontaneousBet[]> {
    this.logger.verbose(
      `User "${user.username}" attempting to get all Spontaneous Bets for series id:${seriesId}.`,
    );
    return await this.spontaneousBetService.getAllSeriesSpontaneousBets(
      seriesId,
    );
  }
  @Patch('/:betId/update')
  async updateBetFields(
    @Body() updateBetFieldsDto: UpdateBetFieldsDto,
    @Param('betId') betId: string,
    @GetUser() user: User,
  ): Promise<SpontaneousBet> {
    this.logger.verbose(
      `User "${user.username}" attempting to update fields to spontaneous bet.`,
    );
    return await this.spontaneousBetService.updateBetFields(
      updateBetFieldsDto,
      betId,
    );
  }
  @Delete('/:betId/delete')
  async deleteBet(
    @Param('betId') betId: string,
    @GetUser() user: User,
  ): Promise<void> {
    this.logger.verbose(
      `User "${user.username}" attempting to delete spontaneous bet with id:"${betId}".`,
    );
    return await this.spontaneousBetService.deleteBet(betId);
  }
}
