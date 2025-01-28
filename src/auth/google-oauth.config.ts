import { ConfigService, registerAs } from '@nestjs/config';

export default registerAs('googleOAuth', () => {
  const configService = new ConfigService();
  return {
    clientID: configService.get<string>('GOOGLE_CLIENT_ID'),
    clientSecret: configService.get<string>('GOOGLE_SECRET'),
    callbackURL: configService.get<string>('GOOGLE_CALLBACK_URL'),
  };
});
