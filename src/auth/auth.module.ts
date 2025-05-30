import { forwardRef, Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersRepository } from './users.repository';
import { User } from './user.entity';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './strategies/jwt.strategy';
import { ConfigModule, ConfigService } from '@nestjs/config';
import googleOauthConfig from './google-oauth.config';
import { GoogleStrategy } from './strategies/google.strategy';
import { AppLogger } from 'src/logging/logger.service';
import { UserInitializationModule } from 'src/user-initialization/user-initialization.module';

@Module({
  imports: [
    ConfigModule,
    ConfigModule.forFeature(googleOauthConfig),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get('EXPIRE_IN') || '3600s',
        },
      }),
    }),
    TypeOrmModule.forFeature([User]),
    forwardRef(() => UserInitializationModule),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    UsersRepository,
    JwtStrategy,
    GoogleStrategy,
    AppLogger,
  ],
  exports: [JwtStrategy, PassportModule, AuthService],
})
export class AuthModule {}
