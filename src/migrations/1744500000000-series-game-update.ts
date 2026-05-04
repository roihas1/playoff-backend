import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeriesGameUpdate1744500000000 implements MigrationInterface {
  name = 'SeriesGameUpdate1744500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "series_game_update" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "gameId" character varying NOT NULL,
        "gameDate" character varying NOT NULL,
        "winnerTeamId" character varying NOT NULL,
        "seriesId" character varying,
        "appliedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_series_game_update_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_series_game_update_gameId" ON "series_game_update" ("gameId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "UQ_series_game_update_gameId"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "series_game_update"`);
  }
}
