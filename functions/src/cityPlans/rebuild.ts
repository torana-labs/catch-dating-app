import {Timestamp} from "firebase-admin/firestore";
import {logger} from "firebase-functions";
import {canonicalMarkets} from "../locations/marketConfig";
import {validateCityPlansDocument} from
  "../shared/generated/validators/cityPlansDocument";
import {collections as publicPageCollections} from "../publicPages/rebuild";
import {projectPublicOrganizer, type HostListing} from
  "../publicPages/publicOrganizer";
import {
  buildCityPlans,
  type CityMarket,
  type CityOrganizerPage,
  type CityPlans,
} from "./cityPlansModel";

type Firestore = FirebaseFirestore.Firestore;

export const cityPlansCollection = "cityPlans";

/** Launched and planned markets each have a city document. */
export const cityMarkets: readonly CityMarket[] = canonicalMarkets
  .flatMap((market) => market.launchStatus === "launched" ||
    market.launchStatus === "planned" ? [{slug: market.slug,
      label: market.label, launchStatus: market.launchStatus}] : []);

// Past these a city fails closed rather than show a partial page.
const organizerPageReadBound = 500;
const joiningOrganizerReadBound = 200;

export class CityPlansReadBoundError extends Error {
  constructor(collection: string, citySlug: string) {
    super(`${collection} for ${citySlug} exceed the city plans read bound.`);
  }
}

export function cityMarket(slug: unknown): CityMarket | null {
  return cityMarkets.find((market) => market.slug === slug) ?? null;
}

const pageFields = ["organizerId", "path", "identity", "upcomingEvents",
  "followerCount", "claim"] as const;

/** Reads what one city shows: its organizer pages, or who is joining. */
export async function readCityPlanSources(
  db: Firestore, market: CityMarket, now: number
) {
  if (market.launchStatus === "launched") {
    const snapshot = await db.collection(publicPageCollections.organizerPages)
      .where("identity.citySlug", "==", market.slug)
      .limit(organizerPageReadBound + 1)
      .select(...pageFields)
      .get();
    if (snapshot.size > organizerPageReadBound) {
      throw new CityPlansReadBoundError("organizerPublicPage", market.slug);
    }
    return {market, now, joiningOrganizers: [],
      organizerPages: snapshot.docs.map((doc) =>
        doc.data() as CityOrganizerPage)};
  }
  const snapshot = await db.collection("organizers")
    .where("publicPage.citySlug", "==", market.slug)
    .where("publicPage.publishStatus", "==", "published")
    .limit(joiningOrganizerReadBound + 1)
    .get();
  if (snapshot.size > joiningOrganizerReadBound) {
    throw new CityPlansReadBoundError("organizers", market.slug);
  }
  // The same publication rules as an organizer page, with this city treated
  // as live: everything but the market gate must pass.
  const eligible = new Set([market.slug]);
  const joiningOrganizers = snapshot.docs.flatMap((doc): HostListing[] => {
    const listing = projectPublicOrganizer(doc.id, doc.data(), eligible);
    return listing ? [listing] : [];
  });
  return {market, now, organizerPages: [], joiningOrganizers};
}

/** A city document that breaks its contract is never stored. */
export function contractValidCityPlans(
  plans: CityPlans, builtAt: Timestamp
): boolean {
  if (validateCityPlansDocument({...plans, builtAt})) return true;
  logger.error("City plans break their contract.", {
    citySlug: plans.citySlug, errors: validateCityPlansDocument.errors});
  return false;
}

export type CityCommit = "written" | "superseded" | "invalid";

/**
 * Writes one city in a transaction: a rebuild that read its sources before
 * the stored document's build changes nothing, so a slow rebuild cannot
 * overwrite newer plans. Every committed rebuild writes, which moves builtAt
 * forward even when nothing else changed.
 */
export async function rebuildCityPlans(
  db: Firestore, market: CityMarket, now: () => number = Date.now
): Promise<CityCommit> {
  const readStart = now();
  const plans = buildCityPlans(
    await readCityPlanSources(db, market, readStart));
  const builtAt = Timestamp.fromMillis(readStart);
  if (!contractValidCityPlans(plans, builtAt)) return "invalid";
  const ref = db.collection(cityPlansCollection).doc(market.slug);
  return db.runTransaction(async (tx) => {
    const current = await tx.get(ref);
    const storedAt = current.get("builtAt");
    if (storedAt instanceof Timestamp && storedAt.toMillis() > readStart) {
      return "superseded";
    }
    tx.set(ref, {...plans, builtAt});
    return "written";
  });
}

export interface CityRebuildSummary {
  results: Record<string, CityCommit>;
  failed: string[];
}

/** Rebuilds the named cities, or every city. */
export async function rebuildCities(
  db: Firestore, slugs?: Iterable<string>, now?: () => number
): Promise<CityRebuildSummary> {
  const wanted = slugs ? new Set(slugs) : null;
  const summary: CityRebuildSummary = {results: {}, failed: []};
  for (const market of cityMarkets) {
    if (wanted && !wanted.has(market.slug)) continue;
    try {
      summary.results[market.slug] = await rebuildCityPlans(db, market, now);
    } catch (error) {
      summary.failed.push(market.slug);
      logger.error("City plans rebuild failed.",
        {citySlug: market.slug, error});
    }
  }
  return summary;
}
