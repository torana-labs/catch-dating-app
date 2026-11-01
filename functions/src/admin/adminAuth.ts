import {CallableRequest, HttpsError} from "firebase-functions/v2/https";

export const ADMIN_ROLE_CLAIMS = [
  "admin",
  "adminOwner",
  "safetyReviewer",
  "support",
  "salesStaff",
] as const;

/**
 * Claims Admin no longer grants. Admin is three jobs (owner, sales associate,
 * ops and support), so finance and analytics belong to the owner; a role
 * save strips these from the account, and no endpoint admits them.
 */
export const RETIRED_ADMIN_ROLE_CLAIMS = [
  "finance",
  "analyticsViewer",
] as const;

export type AdminRoleClaim = typeof ADMIN_ROLE_CLAIMS[number];

export interface AdminContext {
  uid: string;
  roles: AdminRoleClaim[];
}

/**
 * Returns every admin role claim present on a Firebase Auth token.
 * @param {Record<string, unknown> | undefined} token Auth token claims.
 * @return {AdminRoleClaim[]} Admin role claims.
 */
export function adminRolesFromToken(
  token: Record<string, unknown> | undefined
): AdminRoleClaim[] {
  if (!token) return [];
  return ADMIN_ROLE_CLAIMS.filter((claim) => token[claim] === true);
}

/**
 * Requires an authenticated user with at least one admin role claim.
 * @param {CallableRequest<unknown>} request Callable request.
 * @param {AdminRoleClaim[]} allowedRoles Explicitly admitted endpoint roles.
 * @return {AdminContext} Admin actor context.
 */
export function requireAdmin(
  request: CallableRequest<unknown>,
  allowedRoles: readonly AdminRoleClaim[] =
  ADMIN_ROLE_CLAIMS.filter((role) => role !== "salesStaff")
): AdminContext {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "You must be signed in.");
  }

  const roles = adminRolesFromToken(
    request.auth.token as Record<string, unknown> | undefined
  );
  if (!roles.some((role) => allowedRoles.includes(role))) {
    throw new HttpsError(
      "permission-denied",
      "This account is not authorized for Catch admin."
    );
  }

  return {
    uid: request.auth.uid,
    roles,
  };
}

/**
 * Requires an authenticated admin with one of the allowed role claims.
 * @param {CallableRequest<unknown>} request Callable request.
 * @param {AdminRoleClaim[]} allowedRoles Allowed role claims.
 * @return {AdminContext} Admin actor context.
 */
export function requireAdminRole(
  request: CallableRequest<unknown>,
  allowedRoles: readonly AdminRoleClaim[]
): AdminContext {
  const context = requireAdmin(request, allowedRoles);
  if (!context.roles.some((role) => allowedRoles.includes(role))) {
    throw new HttpsError(
      "permission-denied",
      "This admin role is not authorized for that action."
    );
  }
  return context;
}
