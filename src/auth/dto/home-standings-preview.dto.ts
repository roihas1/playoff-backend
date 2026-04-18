export class GlobalStandingsPreviewDto {
  position: number;
  totalPoints: number;
  label?: string;
}

export class PrivateLeagueStandingsPreviewItemDto {
  id: string;
  name: string;
  position: number;
  totalPoints: number;
}

export class HomeStandingsPreviewDto {
  global: GlobalStandingsPreviewDto;
  privateLeagues: PrivateLeagueStandingsPreviewItemDto[];
}
