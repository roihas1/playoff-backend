import { Controller, Get, UseGuards } from '@nestjs/common';
import { ComparisonPageService } from './comparison-page.service';
import { GetUser } from 'src/auth/get-user.decorator';
import { User } from 'src/auth/user.entity';
import { GetComparisonDataDto } from './dto/get-comparison-data.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@Controller('comparison-page')
@UseGuards(JwtAuthGuard)
export class ComparisonPageController {
  constructor(private readonly comparisonService: ComparisonPageService) {}

  @Get('load')
  async getComparisonData(
    @GetUser() user: User,
  ): Promise<GetComparisonDataDto> {
    return this.comparisonService.getComparisonData(user);
  }
}
