export class StatsRequestDto {
  userId: string;
  dataPoints: number[];
  period: 'daily' | 'monthly';
}
