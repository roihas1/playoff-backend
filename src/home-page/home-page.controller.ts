import { Controller, Get, Logger, UseGuards } from '@nestjs/common';
import { GetUser } from 'src/auth/get-user.decorator';
import { User } from 'src/auth/user.entity';
import { HomePageService } from './home-page.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@Controller('home-page')
@UseGuards(JwtAuthGuard)
export class HomePageController {
  private logger = new Logger('HomePageController', { timestamp: true });
  constructor(private readonly homePageService: HomePageService) {}

  @Get('load')
  async loadHomepageData(@GetUser() user: User) {
    return this.homePageService.getHomepageData(user);
  }
}
