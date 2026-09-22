export function buildCanonicalParamString(
  params: Record<string, string | number | boolean | null | undefined>,
): string {
  const entries = Object.entries(params)
    .filter(([, value]) => value !== undefined)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`);

  return entries.length > 0 ? entries.join('&') : '';
}

export function buildPublicCacheKey(
  scope: string,
  params: Record<string, string | number | boolean | null | undefined> = {},
): string {
  const paramString = buildCanonicalParamString(params);
  return paramString.length > 0
    ? `p:v1:${scope}:${paramString}`
    : `p:v1:${scope}:`;
}

export function buildUserCacheKey(
  userId: string,
  scope: string,
  params: Record<string, string | number | boolean | null | undefined> = {},
): string {
  const paramString = buildCanonicalParamString(params);
  return paramString.length > 0
    ? `u:v1:${userId}:${scope}:${paramString}`
    : `u:v1:${userId}:${scope}:`;
}
