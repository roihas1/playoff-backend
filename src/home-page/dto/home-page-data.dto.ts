import { Series } from 'src/series/series.entity';
import { PlayoffStage } from 'src/playoffs-stage/playoffs-stage.entity';
import { SeriesForHomePage } from 'src/series/series.service';

export class HomepageDataDto {
  userGuessedAll: { [seriesId: string]: boolean };
  seriesList: SeriesForHomePage[];
  playoffsStages: PlayoffStage[];
  userPoints: { [seriesId: string]: number };
}
