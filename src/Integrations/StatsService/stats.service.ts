import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { StatsRequestDto } from '../dto/stats-request.dto';

@Injectable()
export class StatsService {
  private readonly logger = new Logger(StatsService.name);
  private readonly pythonUrl = 'http://127.0.0.1:8000'; // Change for ECS later

  constructor(private readonly httpService: HttpService) {}

  async getCalculatedStats(payload: StatsRequestDto) {
    try {
      this.logger.log(`Sending data to Python stats service...`);

      const { data } = await firstValueFrom(
        this.httpService.post(`${this.pythonUrl}/calculate`, payload),
      );

      return data;
    } catch (error) {
      this.logger.error(`Python Service Error: ${error.message}`);
      throw error;
    }
  }
}
