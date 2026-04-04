import { MigrationInterface, QueryRunner } from 'typeorm';
import { LEGACY_MIGRATION_TOURNAMENT_ID } from '../tournament/legacy-migration-tournament.constants';

export class UserTournamentPointsAndPlayoffStageTournament1743787200000
  implements MigrationInterface
{
  name = 'UserTournamentPointsAndPlayoffStageTournament1743787200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const legacyId = LEGACY_MIGRATION_TOURNAMENT_ID;

    await queryRunner.query(
      `INSERT INTO tournament (id, "sportType", year, name)
       SELECT $1::uuid, 'legacy', 0, 'Legacy (migrated totals)'
       WHERE NOT EXISTS (SELECT 1 FROM tournament WHERE id = $1::uuid)`,
      [legacyId],
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS user_tournament_points (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId" uuid NOT NULL,
        "tournamentId" uuid NOT NULL,
        "fantasyPoints" integer NOT NULL DEFAULT 0,
        "championPoints" integer NOT NULL DEFAULT 0,
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "FK_utp_user" FOREIGN KEY ("userId") REFERENCES "user"(id) ON DELETE CASCADE,
        CONSTRAINT "FK_utp_tournament" FOREIGN KEY ("tournamentId") REFERENCES tournament(id) ON DELETE CASCADE,
        CONSTRAINT "UQ_utp_user_tournament" UNIQUE ("userId", "tournamentId")
      )
    `);

    await queryRunner.query(
      `ALTER TABLE playoff_stage ADD COLUMN IF NOT EXISTS "tournamentId" uuid`,
    );

    await queryRunner.query(
      `UPDATE playoff_stage SET "tournamentId" = $1::uuid WHERE "tournamentId" IS NULL`,
      [legacyId],
    );

    await queryRunner.query(
      `ALTER TABLE playoff_stage ALTER COLUMN "tournamentId" SET NOT NULL`,
    );

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE playoff_stage
          ADD CONSTRAINT "FK_playoff_stage_tournament"
          FOREIGN KEY ("tournamentId") REFERENCES tournament(id) ON DELETE RESTRICT;
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$
    `);

    await queryRunner.query(`
      DO $$
      DECLARE r record;
      BEGIN
        FOR r IN
          SELECT c.conname
          FROM pg_constraint c
          JOIN pg_class t ON c.conrelid = t.oid
          WHERE t.relname = 'playoff_stage'
            AND c.contype = 'u'
            AND cardinality(c.conkey) = 1
        LOOP
          EXECUTE format('ALTER TABLE playoff_stage DROP CONSTRAINT %I', r.conname);
        END LOOP;
      END $$
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE playoff_stage
          ADD CONSTRAINT "UQ_playoff_stage_name_tournamentId"
          UNIQUE (name, "tournamentId");
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$
    `);

    await queryRunner.query(
      `INSERT INTO user_tournament_points (id, "userId", "tournamentId", "fantasyPoints", "championPoints", "updatedAt")
       SELECT gen_random_uuid(), u.id, $1::uuid, COALESCE(u."fantasyPoints", 0), COALESCE(u."championPoints", 0), now()
       FROM "user" u
       ON CONFLICT ("userId", "tournamentId") DO NOTHING`,
      [legacyId],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS user_tournament_points`);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE playoff_stage DROP CONSTRAINT IF EXISTS "UQ_playoff_stage_name_tournamentId";
      END $$
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE playoff_stage DROP CONSTRAINT IF EXISTS "FK_playoff_stage_tournament";
      END $$
    `);

    await queryRunner.query(
      `ALTER TABLE playoff_stage DROP COLUMN IF EXISTS "tournamentId"`,
    );

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE playoff_stage ADD CONSTRAINT "UQ_playoff_stage_name_legacy" UNIQUE (name);
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$
    `);
  }
}
