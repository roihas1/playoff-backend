import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { UserTournamentPointsService } from './user-tournament-points.service';
import { LEGACY_MIGRATION_TOURNAMENT_ID } from 'src/tournament/legacy-migration-tournament.constants';

function singleQueryParam(
  value: string | string[] | undefined,
): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  return Array.isArray(value) ? value[0] : value;
}

@Injectable()
export class MergeUserTournamentPointsInterceptor implements NestInterceptor {
  constructor(
    private readonly userTournamentPointsService: UserTournamentPointsService,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    const req = context.switchToHttp().getRequest();
    const user = req.user;
    if (!user?.id) {
      return next.handle();
    }
    const fromQuery = singleQueryParam(req.query?.tournamentId);
    const fromBody = singleQueryParam(req.body?.tournamentId);
    const tournamentId =
      fromQuery ?? fromBody ?? LEGACY_MIGRATION_TOURNAMENT_ID;
    const points = await this.userTournamentPointsService.getPointsForUser(
      user.id,
      tournamentId,
    );
    req.userTournamentScopedPoints = points;
    return next.handle();
  }
}
