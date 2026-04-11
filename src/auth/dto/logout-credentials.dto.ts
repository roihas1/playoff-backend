/**
 * Logout is authenticated via JWT (`PATCH /auth/logout` + `Authorization` header).
 * A body is not required; do not send `username` to identify the session.
 *
 * @deprecated Previously used for username in the request body. Kept only so
 *   release notes / search can find the old contract.
 */
export class LogoutCredentialsDto {}
