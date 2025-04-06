import { Body, Controller, Logger, Post, UseGuards } from '@nestjs/common';
import { SpontaneousGuessService } from './spontaneous-guess.service';
import { SpontaneousGuess } from './spontaneous-guess.entity';
import { GetUser } from 'src/auth/get-user.decorator';
import { User } from 'src/auth/user.entity';
import { CreateSpontaneousGuessDto } from './dto/create-spontaneous-guess.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { UpdateSpontaneousGuessesDto } from './dto/update-spontaneous-guess.dto';

@Controller('spontaneous-guess')
@UseGuards(JwtAuthGuard)
export class SpontaneousGuessController {
  private logger = new Logger('SpontaneousGuessController', {
    timestamp: true,
  });
  constructor(private spontaneousGuessService: SpontaneousGuessService) {}

  @Post()
  async createSpontaneousGuess(
    @Body() createSpontaneousGuessDto: CreateSpontaneousGuessDto,
    @GetUser() user: User,
  ): Promise<SpontaneousGuess> {
    this.logger.verbose(
      `User "${user.username}" creating new SpontaneousGuess. Data: ${JSON.stringify(createSpontaneousGuessDto)}.`,
    );
    return await this.spontaneousGuessService.createSpontaneousGuess(
      createSpontaneousGuessDto,
      user,
    );
  }
  @Post('/update')
  async createOrUpdateGuesses(
    @Body() updateGuessesDto: UpdateSpontaneousGuessesDto,
    @GetUser() user: User,
  ): Promise<void> {
    this.logger.verbose(
      `User "${user.username}" creating or Updating new SpontaneousGuesses. Data: ${JSON.stringify(updateGuessesDto)}.`,
    );
    return await this.spontaneousGuessService.createOrUpdateGuesses(
      updateGuessesDto,
      user,
    );
  }
}
