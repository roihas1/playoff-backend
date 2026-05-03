export interface BalldontlieTeam {
  id: number;
  abbreviation: string;
  city?: string;
  conference?: string;
  division?: string;
  full_name?: string;
  name?: string;
}

export interface BalldontlieGameDto {
  id: number;
  date: string;
  status: string;
  period: number;
  time?: string | null;
  postseason: boolean;
  home_team: BalldontlieTeam;
  visitor_team: BalldontlieTeam;
  home_team_score: number;
  visitor_team_score: number;
  season?: number;
}

export interface BalldontlieListMeta {
  next_cursor?: number | null;
  per_page?: number;
}

export interface BalldontlieGamesResponse {
  data: BalldontlieGameDto[];
  meta?: BalldontlieListMeta;
}
