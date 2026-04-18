import { PlayoffStage } from 'src/playoffs-stage/playoffs-stage.entity';
import { SeriesForHomePage } from 'src/series/series.service';
import { HomeStandingsPreviewDto } from 'src/auth/dto/home-standings-preview.dto';

export class HomepageDataDto {
  userGuessedAll: { [seriesId: string]: boolean };
  seriesList: SeriesForHomePage[];
  playoffsStages: PlayoffStage[];
  userPoints: { [seriesId: string]: number };
  leagueStandingsPreview: HomeStandingsPreviewDto | null;
}
