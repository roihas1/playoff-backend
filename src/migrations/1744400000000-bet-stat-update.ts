import { MigrationInterface, QueryRunner } from 'typeorm';

export class BetStatUpdateLedger1744400000000 implements MigrationInterface {
  name = 'BetStatUpdateLedger1744400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "bet_stat_update" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "betId" character varying NOT NULL,
        "gameId" character varying NOT NULL,
        "gameDate" character varying NOT NULL,
        "betKind" character varying NOT NULL,
        "categories" text array,
        "player1Name" character varying,
        "player2Name" character varying,
        "player1Value" double precision,
        "player2Value" double precision,
        "appliedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "rawSource" jsonb,
        CONSTRAINT "PK_bet_stat_update_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_bet_stat_update_betId_gameId" ON "bet_stat_update" ("betId", "gameId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "UQ_bet_stat_update_betId_gameId"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "bet_stat_update"`);
  }
}
