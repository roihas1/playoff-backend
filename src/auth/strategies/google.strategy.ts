import { Inject, Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-google-oauth20';
import googleOauthConfig from '../google-oauth.config';
import { ConfigType } from '@nestjs/config';
import { VerifiedCallback } from 'passport-jwt';
import { AuthService } from '../auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy) {
  constructor(
    @Inject(googleOauthConfig.KEY)
    private googleConfiguration: ConfigType<typeof googleOauthConfig>,
    private authService: AuthService,
  ) {
    super({
      clientID: googleConfiguration.clientID,
      clientSecret: googleConfiguration.clientSecret,
      callbackURL: googleConfiguration.callbackURL,
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifiedCallback,
  ) {
    const email = profile.emails?.[0]?.value;

    const [fallbackFirst, fallbackLast] = profile.displayName?.split(' ') ?? [];

    const firstName = profile.name?.givenName || fallbackFirst || 'First';

    const lastName = profile.name?.familyName || fallbackLast || 'Last';

    const username =
      profile.displayName?.replace(/\s+/g, '_') ||
      email?.split('@')[0] ||
      'user';

    const user = await this.authService.validateGoogleUser({
      email,
      firstName,
      lastName,
      password: '',
      username,
      googleId: profile.id,
    });

    done(null, user);
  }
}
