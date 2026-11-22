import {createHash} from "node:crypto";
import {HttpsError} from "firebase-functions/v2/https";

const firestoreAutoIdPattern = /^[A-Za-z0-9]{20}$/;
const organizerPublicSlugPattern =
  /^[a-z0-9](?:[a-z0-9-]{1,62}[a-z0-9])?$/;

/**
 * Accepts only ids produced by Firestore's auto-id generator.
 *
 * Clients reserve an id before media upload, but neither clients nor Admin
 * may turn a human-readable slug into the canonical document identity.
 */
export function requireFirestoreAutoId(
  value: string,
  label = "Organizer id"
): string {
  if (!firestoreAutoIdPattern.test(value)) {
    throw new HttpsError(
      "invalid-argument",
      `${label} must be a 20-character Firestore auto-id.`
    );
  }
  return value;
}

/**
 * Produces a stable, human-readable public slug independently of document id.
 *
 * The id-derived suffix prevents ordinary name collisions; the canonical
 * route reservation remains the authoritative uniqueness check.
 */
export function defaultOrganizerPublicSlug(
  name: string,
  organizerId: string
): string {
  const suffix = createHash("sha256")
    .update(organizerId)
    .digest("hex")
    .slice(0, 12);
  const maximumBaseLength = 64 - suffix.length - 1;
  const normalizedName = name
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[\u0300-\u036f]/gu, "")
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "")
    .slice(0, maximumBaseLength)
    .replace(/-+$/gu, "");
  return `${normalizedName || "organizer"}-${suffix}`;
}

/** Normalizes and validates an operator-supplied public route slug. */
export function normalizeOrganizerPublicSlug(value: string): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "");
  if (
    normalized.length < 3 ||
    normalized.length > 64 ||
    !organizerPublicSlugPattern.test(normalized)
  ) {
    throw new HttpsError(
      "invalid-argument",
      "Public slug must be 3-64 lowercase letters, numbers, or hyphens."
    );
  }
  return normalized;
}

/**
 * A route-safe slug suggested from a name, which a reviewer can accept or
 * edit: lowercase letters, numbers and hyphens, 3-64 long.
 */
export function publicSlugFor(value: string): string {
  const slug = value.normalize("NFKD").toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "")
    .slice(0, 64)
    .replace(/-+$/u, "");
  return slug.length >= 3 ? slug :
    `organizer-${slug || "listing"}`.slice(0, 64);
}
