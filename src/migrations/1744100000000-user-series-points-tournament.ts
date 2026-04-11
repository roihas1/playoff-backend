import { MigrationInterface, QueryRunner } from 'typeorm';

export class UserSeriesPointsTournament1744100000000
  implements MigrationInterface
{
  name = 'UserSeriesPointsTournament1744100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_series_points" ADD COLUMN IF NOT EXISTS "tournamentId" uuid`,
    );
    await queryRunner.query(`
      UPDATE "user_series_points" usp
      SET "tournamentId" = s."tournamentId"
      FROM series s
      WHERE usp."seriesId" = s.id
    `);
    await queryRunner.query(`
      ALTER TABLE "user_series_points"
      ADD CONSTRAINT "FK_user_series_points_tournament"
      FOREIGN KEY ("tournamentId") REFERENCES tournament(id) ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_series_points" DROP CONSTRAINT IF EXISTS "FK_user_series_points_tournament"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_series_points" DROP COLUMN IF EXISTS "tournamentId"`,
    );
  }
}
