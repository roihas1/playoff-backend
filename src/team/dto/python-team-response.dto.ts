/**
 * Shape of a single team item returned by the Python service (GET /teams).
 * Response wrapper: { teams: PythonTeamResponseItem[], count: number }
 */
export interface PythonTeamResponseItem {
  id: string;
  nbaTeamId: number | null;
  name: string;
  city: string;
  abbreviation: string;
  conference: string;
  isActive: boolean;
}

export interface PythonTeamsResponse {
  teams: PythonTeamResponseItem[];
  count: number;
}
