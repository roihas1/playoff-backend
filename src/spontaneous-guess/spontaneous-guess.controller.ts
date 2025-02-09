import { Body, Controller, Logger, Patch, Post, UseGuards } from '@nestjs/common';
import { SpontaneousGuessService } from './spontaneous-guess.service';
import { SpontaneousGuess } from './spontaneous-guess.entity';
import { GetUser } from 'src/auth/get-user.decorator';
import { User } from 'src/auth/user.entity';
import { CreateSpontaneousGuessDto } from './dto/create-spontaneous-guess.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

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

}
