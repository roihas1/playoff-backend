import { MyProfileDto } from './my-profile.dto';

export class UpdateMyProfileResponseDto {
  profile: MyProfileDto;
  accessToken?: string;
  expiresIn?: number;
}
