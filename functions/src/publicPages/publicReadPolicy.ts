/**
 * Publication authorization for the public page read models. This mirrors
 * website/src/server/publicReadPolicy.ts rule for rule; the shared parity
 * fixtures in contracts/fixtures/public_pages hold both to the same output.
 */
export type PublicDocument = Record<string, unknown>;

export function object(value: unknown): PublicDocument | null {
  return value !== null && typeof value === "object" &&
    !Array.isArray(value) ? value as PublicDocument : null;
}

export function publicDocumentId(value: unknown): value is string {
  return typeof value === "string" &&
    /^[A-Za-z0-9][A-Za-z0-9_-]{0,179}$/u.test(value);
}

export function organizerPath(value: unknown): value is string {
  return typeof value === "string" && value.length <= 240 &&
    /^\/organizers\/(?:[a-z0-9-]+\/){1,2}$/u.test(value);
}

export function synthetic(data: PublicDocument): boolean {
  return data.synthetic === true || data.dataOrigin === "catchDemo" ||
    data.seedPrefix != null || data.scenario != null ||
    data.demoOps != null || data.demoOpsId != null ||
    data.demoOpsCommand != null;
}

/** Check publication independently of indexing and native app discovery. */
export function publicOrganizerAuthorized(
  raw: unknown,
  liveMarkets: ReadonlySet<string>
): boolean {
  const data = object(raw);
  if (!data || synthetic(data) || data.archived === true ||
      data.status === "archived") return false;
  const page = object(data.publicPage);
  const claim = object(data.claim);
  const ownership = object(data.ownership);
  if (page?.publishStatus !== "published" ||
      !organizerPath(page.canonicalPath) ||
      !["unclaimed", "claimPending", "claimed", "verified"]
        .includes(String(claim?.state)) ||
      !["programmatic", "userCreated", "claimed", "transferred"]
        .includes(String(ownership?.state)) ||
      !["noindex", "indexReady", "indexed"]
        .includes(String(page.indexStatus)) ||
      !["index, follow", "noindex, follow"]
        .includes(String(page.robots))) return false;
  const market = String(page.citySlug ?? data.location ?? "")
    .trim().toLowerCase();
  return liveMarkets.has(market);
}

/** No legacy missing-publication fallback and no authentication grant. */
export function publicEventAuthorized(id: unknown, raw: unknown): boolean {
  const data = object(raw);
  if (!publicDocumentId(id) || !data || synthetic(data) ||
      data.publicationState !== "published" ||
      data.status !== "active") return false;
  const organizerId = data.organizerId ?? data.clubId;
  return publicDocumentId(organizerId) &&
    !(data.organizerId && data.clubId && data.organizerId !== data.clubId);
}

/** Public links must not carry embedded credentials or active schemes. */
export function publicHttpsUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 4096) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password ?
      url.href : null;
  } catch {
    return null;
  }
}
