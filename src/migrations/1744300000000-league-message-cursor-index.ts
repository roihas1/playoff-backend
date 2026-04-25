import { MigrationInterface, QueryRunner } from 'typeorm';

export class LeagueMessageCursorIndex1744300000000
  implements MigrationInterface
{
  name = 'LeagueMessageCursorIndex1744300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_f2a24c3152d43f6b13f2914f30"`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_league_message_leagueId_createdAt_id_desc" ON "league_message" ("leagueId", "createdAt" DESC, "id" DESC)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_league_message_leagueId_createdAt_id_desc"`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_f2a24c3152d43f6b13f2914f30" ON "league_message" ("leagueId", "createdAt")`,
    );
  }
}
