/**
 * How long Catch keeps a closed support conversation and its messages:
 * 180 days after it closes, or after the person's account is deleted,
 * whichever is later (#2468). The period matches the safety-record
 * retention; it is a default the owner is to confirm.
 */
export const SUPPORT_RETENTION_DAYS = 180;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * When a conversation closed (or its account deleted) at `fromMillis`
 * expires.
 * @param {number} fromMillis Close or deletion time.
 * @return {number} Expiry time in milliseconds.
 */
export function supportExpiresAtMillis(fromMillis: number): number {
  return fromMillis + SUPPORT_RETENTION_DAYS * DAY_MS;
}
