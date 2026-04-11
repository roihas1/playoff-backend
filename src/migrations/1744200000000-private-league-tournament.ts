import { MigrationInterface, QueryRunner } from 'typeorm';
import { LEGACY_MIGRATION_TOURNAMENT_ID } from '../tournament/legacy-migration-tournament.constants';

export class PrivateLeagueTournament1744200000000
  implements MigrationInterface
{
  name = 'PrivateLeagueTournament1744200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const legacyId = LEGACY_MIGRATION_TOURNAMENT_ID;

    await queryRunner.query(
      `ALTER TABLE "private_league" ADD COLUMN IF NOT EXISTS "tournamentId" uuid`,
    );
    await queryRunner.query(
      `UPDATE "private_league" SET "tournamentId" = $1::uuid WHERE "tournamentId" IS NULL`,
      [legacyId],
    );
    await queryRunner.query(
      `ALTER TABLE "private_league" ALTER COLUMN "tournamentId" SET NOT NULL`,
    );
    await queryRunner.query(`
      ALTER TABLE "private_league"
      ADD CONSTRAINT "FK_private_league_tournament"
      FOREIGN KEY ("tournamentId") REFERENCES tournament(id) ON DELETE RESTRICT
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "private_league" DROP CONSTRAINT IF EXISTS "FK_private_league_tournament"`,
    );
    await queryRunner.query(
      `ALTER TABLE "private_league" DROP COLUMN IF EXISTS "tournamentId"`,
    );
  }
}
