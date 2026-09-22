import { AppCacheService } from './app-cache.service';

/** Standard invalidation after a user guess write (non-champion). */
export async function invalidateAfterGuessWrite(
  cache: AppCacheService,
  actorId: string,
): Promise<void> {
  await cache.delByPrefix(cache.userPrefix(actorId));
  await cache.delByPrefix('p:v1:stats/guess-page:');
  await cache.delByPrefix('p:v1:series/percentages:');
}

/** Guess write invalidation plus playoff-stage public cache for champion guesses. */
export async function invalidateAfterChampionGuessWrite(
  cache: AppCacheService,
  actorId: string,
): Promise<void> {
  await invalidateAfterGuessWrite(cache, actorId);
  await cache.delByPrefix('p:v1:playoffs-stage/all:');
}

/** After a single user's points changed. */
export async function invalidateAfterUserPointsChange(
  cache: AppCacheService,
  userId: string,
): Promise<void> {
  await cache.delByPrefix(cache.userPrefix(userId));
  await cache.delByPrefix('p:v1:auth/users:');
  await cache.delByPrefix('p:v1:auth/standings:');
}

/** After profile or list changes affecting auth public caches. */
export async function invalidateAfterAuthProfileChange(
  cache: AppCacheService,
  userId: string,
): Promise<void> {
  await cache.delByPrefix(cache.userPrefix(userId));
  await cache.delByPrefix('p:v1:auth/users:');
  await cache.delByPrefix('p:v1:auth/standings:');
}

/** League membership changes affecting stats filtered by league. */
export async function invalidateLeagueMembershipCaches(
  cache: AppCacheService,
  memberIds: string[],
): Promise<void> {
  await Promise.all(
    memberIds.map((id) => cache.delByPrefix(cache.userPrefix(id))),
  );
  await cache.delByPrefix('p:v1:stats/guess-page:');
}

/** Series / bet metadata change (narrow public invalidation). */
export async function invalidateAfterSeriesMetadataChange(
  cache: AppCacheService,
): Promise<void> {
  await cache.delByPrefix('p:v1:series:');
  await cache.delByPrefix('p:v1:stats/guess-page:');
}
