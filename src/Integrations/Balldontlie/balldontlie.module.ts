import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { BalldontlieClient } from './balldontlie.client';

@Module({
  imports: [HttpModule, ConfigModule],
  providers: [BalldontlieClient],
  exports: [BalldontlieClient],
})
export class BalldontlieModule {}
