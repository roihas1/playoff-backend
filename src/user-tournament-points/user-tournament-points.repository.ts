import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { UserSeriesPoints } from 'src/user-series-points/user-series-points.entity';
import { UserTournamentPoints } from './user-tournament-points.entity';

@Injectable()
export class UserTournamentPointsRepository extends Repository<UserTournamentPoints> {
  constructor(private readonly dataSource: DataSource) {
    super(UserTournamentPoints, dataSource.createEntityManager());
  }

  private utpTablePath(): string {
    return this.manager.connection.getMetadata(UserTournamentPoints).tablePath;
  }

  async incrementFantasyPoints(
    userId: string,
    tournamentId: string,
    delta: number,
    manager?: EntityManager,
  ): Promise<void> {
    const m = manager ?? this.manager;
    const table = this.utpTablePath();
    await m.query(
      `INSERT INTO "${table}" (id, "userId", "tournamentId", "fantasyPoints", "championPoints")
       VALUES (gen_random_uuid(), $1, $2, $3, 0)
       ON CONFLICT ("userId", "tournamentId")
       DO UPDATE SET
         "fantasyPoints" = "${table}"."fantasyPoints" + EXCLUDED."fantasyPoints",
         "updatedAt" = CURRENT_TIMESTAMP`,
      [userId, tournamentId, delta],
    );
  }

  async incrementChampionPoints(
    userId: string,
    tournamentId: string,
    delta: number,
    manager?: EntityManager,
  ): Promise<void> {
    const m = manager ?? this.manager;
    const table = this.utpTablePath();
    await m.query(
      `INSERT INTO "${table}" (id, "userId", "tournamentId", "fantasyPoints", "championPoints")
       VALUES (gen_random_uuid(), $1, $2, 0, $3)
       ON CONFLICT ("userId", "tournamentId")
       DO UPDATE SET
         "championPoints" = "${table}"."championPoints" + EXCLUDED."championPoints",
         "updatedAt" = CURRENT_TIMESTAMP`,
      [userId, tournamentId, delta],
    );
  }

  /**
   * Sets fantasyPoints per tournament from SUM(user_series_points.points) joined to series.tournamentId.
   * Rows without a tournament on series are skipped. On conflict, only fantasyPoints (and updatedAt) are updated.
   */
  async applyFantasyTotalsFromUserSeriesPoints(
    userId: string,
    manager?: EntityManager,
  ): Promise<void> {
    const m = manager ?? this.manager;
    const sums = await m
      .createQueryBuilder(UserSeriesPoints, 'usp')
      .innerJoin('usp.series', 'series')
      .select('series.tournamentId', 'tournamentId')
      .addSelect('SUM(usp.points)', 'total')
      .where('usp.userId = :userId', { userId })
      .andWhere('series.tournamentId IS NOT NULL')
      .groupBy('series.tournamentId')
      .getRawMany();

    const table = this.utpTablePath();
    for (const row of sums) {
      const tournamentId = row.tournamentId ?? row.tournamentid;
      const total = Number(row.total ?? row.sum);
      if (!tournamentId) {
        continue;
      }
      await m.query(
        `INSERT INTO "${table}" (id, "userId", "tournamentId", "fantasyPoints", "championPoints")
         VALUES (gen_random_uuid(), $1, $2, $3, 0)
         ON CONFLICT ("userId", "tournamentId")
         DO UPDATE SET
           "fantasyPoints" = EXCLUDED."fantasyPoints",
           "updatedAt" = CURRENT_TIMESTAMP`,
        [userId, tournamentId, total],
      );
    }
  }
}
