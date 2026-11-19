import {logger} from "firebase-functions";
import type {CityPlans} from "./cityPlansModel";

type Firestore = FirebaseFirestore.Firestore;

/**
 * The owner's switch that keeps every city-by-format page out of search,
 * whatever its counts (listings plan B6, 19 Nov 2026). It lives in the
 * server-only `config/discoveryIndexing` document, which client rules deny
 * through `match /config/{docId}`:
 *
 *   {forceNoindex: true, reason: "Pilot paused", updatedAt: <timestamp>}
 *
 * The owner sets `forceNoindex` in the Firebase console; the hourly city
 * plans rebuild applies it within the hour. With no document, or
 * `forceNoindex: false`, the indexing bar in `discoveryFormats.ts` decides.
 * A document in any other shape forces noindex too: a kill switch that
 * cannot be read fails closed.
 */
export const discoveryIndexingConfig = {
  collection: "config",
  document: "discoveryIndexing",
} as const;

export type FormatPageIndexingOverride =
  | {forceNoindex: false; source: "absent" | "off"}
  | {forceNoindex: true; source: "on" | "invalid"};

const allowedFields = new Set(["forceNoindex", "reason", "updatedAt",
  "updatedBy"]);

/** The override a stored config document asks for. Pure. */
export function parseDiscoveryIndexingConfig(
  data: unknown
): FormatPageIndexingOverride {
  if (data === undefined) return {forceNoindex: false, source: "absent"};
  const valid = data !== null && typeof data === "object" &&
    !Array.isArray(data) &&
    typeof (data as {forceNoindex?: unknown}).forceNoindex === "boolean" &&
    Object.keys(data).every((key) => allowedFields.has(key));
  if (!valid) return {forceNoindex: true, source: "invalid"};
  return (data as {forceNoindex: boolean}).forceNoindex ?
    {forceNoindex: true, source: "on"} :
    {forceNoindex: false, source: "off"};
}

/** Reads the owner's format page indexing override. */
export async function readFormatPageIndexingOverride(
  db: Firestore
): Promise<FormatPageIndexingOverride> {
  const snapshot = await db.collection(discoveryIndexingConfig.collection)
    .doc(discoveryIndexingConfig.document).get();
  const override = parseDiscoveryIndexingConfig(
    snapshot.exists ? snapshot.data() : undefined);
  if (override.source === "invalid") {
    logger.error("config/discoveryIndexing is malformed; every format " +
      "page stays noindex until it is fixed.");
  }
  return override;
}

/** The city's plans with every format page noindex when forced. Pure. */
export function applyFormatPageIndexingOverride(
  plans: CityPlans, override: FormatPageIndexingOverride
): CityPlans {
  if (!override.forceNoindex) return plans;
  const formatPages = Object.fromEntries(Object.entries(plans.formatPages)
    .map(([format, page]) => [format, {...page, indexing: "noindex, follow"}])
  ) as CityPlans["formatPages"];
  return {...plans, formatPages};
}
