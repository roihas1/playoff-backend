import { Round } from '../round.enum';
import { Conference } from '../conference.enum';

export interface CreateSeriesData {
  team1Id: string;
  team2Id: string;
  seed1: number;
  seed2: number;
  round: Round;
  conference: Conference;
  dateOfStart: string;
  timeOfStart: string;
  tournamentId?: string;
}
