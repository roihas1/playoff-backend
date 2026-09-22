import { AppCacheService } from './app-cache.service';
import { PUBLIC_KEY_PREFIX, USER_KEY_PREFIX } from './cache.constants';

/** Standard invalidation after a user guess write (non-champion). */
export async function invalidateAfterGuessWrite(
  cache: AppCacheService,
  actorId: string,
): Promise<void> {
  await cache.delByPrefix(cache.userPrefix(actorId));
  await cache.delByPrefix(`${PUBLIC_KEY_PREFIX}stats/guess-page:`);
  await cache.delByPrefix(`${PUBLIC_KEY_PREFIX}series/percentages:`);
}

/** Guess write invalidation plus playoff-stage public cache for champion guesses. */
export async function invalidateAfterChampionGuessWrite(
  cache: AppCacheService,
  actorId: string,
): Promise<void> {
  await invalidateAfterGuessWrite(cache, actorId);
  await cache.delByPrefix(`${PUBLIC_KEY_PREFIX}playoffs-stage/`);
}

/** After a single user's points changed. */
export async function invalidateAfterUserPointsChange(
  cache: AppCacheService,
  userId: string,
): Promise<void> {
  await cache.delByPrefix(cache.userPrefix(userId));
  await cache.delByPrefix(`${PUBLIC_KEY_PREFIX}auth/users:`);
  await cache.delByPrefix(`${PUBLIC_KEY_PREFIX}auth/standings:`);
}

/** After profile or list changes affecting auth public caches. */
export async function invalidateAfterAuthProfileChange(
  cache: AppCacheService,
  userId: string,
): Promise<void> {
  await cache.delByPrefix(cache.userPrefix(userId));
  await cache.delByPrefix(`${PUBLIC_KEY_PREFIX}auth/users:`);
  await cache.delByPrefix(`${PUBLIC_KEY_PREFIX}auth/standings:`);
}

/** League membership changes affecting stats filtered by league. */
export async function invalidateLeagueMembershipCaches(
  cache: AppCacheService,
  memberIds: string[],
): Promise<void> {
  await Promise.all(
    memberIds.map((id) => cache.delByPrefix(cache.userPrefix(id))),
  );
  await cache.delByPrefix(`${PUBLIC_KEY_PREFIX}stats/guess-page:`);
}

/** Series / bet metadata change (narrow public invalidation). */
export async function invalidateAfterSeriesMetadataChange(
  cache: AppCacheService,
): Promise<void> {
  // Scopes are `series/list`, `series/bets`, etc. — not `series:`.
  await cache.delByPrefix(`${PUBLIC_KEY_PREFIX}series/`);
  await cache.delByPrefix(
    `${PUBLIC_KEY_PREFIX}comparison-page/series-catalog:`,
  );
  await cache.delByPrefix(`${PUBLIC_KEY_PREFIX}stats/guess-page:`);
}

/** Drop every per-user cache entry (home, guesses, missing bets, points). */
export async function invalidateAllUserCaches(
  cache: AppCacheService,
): Promise<void> {
  await cache.delByPrefix(USER_KEY_PREFIX);
}

/**
 * After a bulk points recalc: standings/user lists plus all per-user derived
 * caches. Leaves public series/tournament catalogs intact.
 */
export async function invalidateAfterGlobalPointsRecalc(
  cache: AppCacheService,
): Promise<void> {
  await cache.delByPrefix(`${PUBLIC_KEY_PREFIX}auth/users:`);
  await cache.delByPrefix(`${PUBLIC_KEY_PREFIX}auth/standings:`);
  await invalidateAllUserCaches(cache);
}

/**
 * Series score/result change: public series graphs plus standings because
 * points may have shifted.
 */
export async function invalidateAfterSeriesResultChange(
  cache: AppCacheService,
): Promise<void> {
  await invalidateAfterSeriesMetadataChange(cache);
  await invalidateAfterGlobalPointsRecalc(cache);
}

/** Champion stage close: playoff-stage public caches plus standings. */
export async function invalidateAfterPlayoffStageClose(
  cache: AppCacheService,
): Promise<void> {
  await cache.delByPrefix(`${PUBLIC_KEY_PREFIX}playoffs-stage/`);
  await invalidateAfterGlobalPointsRecalc(cache);
}

/** Team name/logo data feeds series catalogs. */
export async function invalidateAfterTeamSync(
  cache: AppCacheService,
): Promise<void> {
  await invalidateAfterSeriesMetadataChange(cache);
}

/** User deletion affects standings for everyone plus that user's keys. */
export async function invalidateAfterUserDeletion(
  cache: AppCacheService,
  userId: string,
): Promise<void> {
  await invalidateAfterAuthProfileChange(cache, userId);
  await invalidateAllUserCaches(cache);
}

/** Missing-bets rewrite for all users. */
export async function invalidateAfterMissingBetsRecalc(
  cache: AppCacheService,
): Promise<void> {
  await invalidateAllUserCaches(cache);
}

/** Slate grading mutates bet results and then rescores every user. */
export async function invalidateAfterSlateGrading(
  cache: AppCacheService,
): Promise<void> {
  await invalidateAfterSeriesResultChange(cache);
}
