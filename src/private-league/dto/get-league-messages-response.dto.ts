import { LeagueMessageDto } from './league-message.dto';
import { LeagueMessagesPageInfoDto } from './league-messages-page-info.dto';

export class GetLeagueMessagesResponseDto {
  data: LeagueMessageDto[];
  pageInfo: LeagueMessagesPageInfoDto;
}
