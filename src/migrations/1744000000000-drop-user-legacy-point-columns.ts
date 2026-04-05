import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Drops legacy per-user aggregate columns after cutover to user_tournament_points.
 * Run only after user_tournament_points is populated and all app instances use UTP.
 */
export class DropUserLegacyPointColumns1744000000000
  implements MigrationInterface
{
  name = 'DropUserLegacyPointColumns1744000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" DROP COLUMN IF EXISTS "fantasyPoints"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" DROP COLUMN IF EXISTS "championPoints"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" ADD "fantasyPoints" integer NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD "championPoints" integer NOT NULL DEFAULT 0`,
    );
  }
}
