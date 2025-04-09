import { Series } from 'src/series/series.entity';
import { PlayoffStage } from 'src/playoffs-stage/playoffs-stage.entity';

export class HomepageDataDto {
  userGuessedAll: { [seriesId: string]: boolean };
  seriesList: Series[];
  playoffsStages: PlayoffStage[];
  userPoints: { [seriesId: string]: number };
}
