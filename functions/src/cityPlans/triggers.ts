import * as admin from "firebase-admin";
import {logger} from "firebase-functions";
import {onDocumentWritten} from "firebase-functions/v2/firestore";
import {onSchedule} from "firebase-functions/v2/scheduler";
import {cityMarket, rebuildCities} from "./rebuild";

type Raw = Record<string, unknown> | undefined;

/** The city an organizer page belongs to, if it has one. */
export function pageCity(data: Raw): string | null {
  const identity = data?.identity as {citySlug?: unknown} | undefined;
  return cityMarket(identity?.citySlug)?.slug ?? null;
}

/**
 * Organizer pages are written only when their content changes, so a page
 * write rebuilds the city it left and the city it is in.
 */
export const onCityPlansOrganizerPageWritten = onDocumentWritten({
  document: "organizerPublicPage/{organizerId}", retry: true,
  memory: "512MiB", timeoutSeconds: 300,
}, async (event) => {
  const cities = new Set([pageCity(event.data?.before.data()),
    pageCity(event.data?.after.data())]);
  cities.delete(null);
  if (!cities.size) return;
  const summary = await rebuildCities(admin.firestore(),
    cities as Set<string>);
  logger.info("City plans rebuilt.", {
    organizerId: event.params.organizerId, ...summary});
  if (summary.failed.length) {
    throw new Error(`${summary.failed.length} cities failed to rebuild.`);
  }
});

/**
 * Hourly, every city rebuilds: plans move into the 14-day window, ended
 * plans leave it, and cities that have not launched pick up organisers.
 */
export const rebuildCityPlansHourly = onSchedule({
  schedule: "every 60 minutes", region: "asia-south1", maxInstances: 1,
  timeoutSeconds: 540, memory: "512MiB",
}, async () => {
  const summary = await rebuildCities(admin.firestore());
  logger.info("City plans rebuilt.", summary);
  if (summary.failed.length) {
    throw new Error(`${summary.failed.length} cities failed to rebuild.`);
  }
});
