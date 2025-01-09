import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UnauthorizedException } from '@nestjs/common';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(err, user, info) {
    if (err || !user) {
      // Handle the case where the token is expired or invalid
      if (info && info.message === 'jwt expired') {
        throw new UnauthorizedException('Token has expired');
      } else {
        throw new UnauthorizedException('Unauthorized access');
      }
    }

    // Return the user if authenticated successfully
    return user;
  }
}
