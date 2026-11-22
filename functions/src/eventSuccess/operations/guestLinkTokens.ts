import {createHash, createHmac, timingSafeEqual} from "node:crypto";
import type {GuestLinkSigningKeys} from
  "../../platform/guestLinkSigningKeys";
import type {Grant} from "./guestRecords";

export function grantSecret(grant: Grant, keys: GuestLinkSigningKeys): string {
  const key = keys.keyFor(grant.signingKeyId);
  if (!Buffer.isBuffer(key) || key.length < 32) {
    throw new Error("Guest link signing key must have at least 256 bits");
  }
  return createHmac("sha256", key).update(JSON.stringify([
    "catch:event-assistance:guest-grant:v1", grant.signingKeyId,
    grant.linkId, grant.threadId, grant.guestId,
    [grant.context.mode, grant.context.eventId, grant.context.organizerId],
    grant.attendeeId, grant.episodeId, grant.issuedAt, grant.expiresAt,
  ])).digest("base64url");
}

export function guestSecretHash(secret: string): string {
  return createHash("sha256").update("catch:guest-secret:v1:" + secret)
    .digest("hex");
}

export function matchesGuestSecret(grant: Grant, secret: string): boolean {
  if (!/^[A-Za-z0-9_-]{43}$/.test(secret)) return false;
  return timingSafeEqual(Buffer.from(grant.tokenHash, "hex"),
    Buffer.from(guestSecretHash(secret), "hex"));
}
