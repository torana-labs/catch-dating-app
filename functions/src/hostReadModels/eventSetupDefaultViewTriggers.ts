import * as admin from "firebase-admin";
import {onDocumentWritten} from "firebase-functions/v2/firestore";
import {reconcileEventSetupDefaultView} from "./eventSetupDefaultViewStore";
import {defineProjections} from "../platform/dispatch/runtime";

type SourceData = FirebaseFirestore.DocumentData | undefined;

/** Organizer fields the defaults projection reads, plus the rules' gates. */
export const eventSetupDefaultOrganizerFields = [
  "locationCityId",
  "locationMarketId",
  "hostDefaults",
  "status",
  "archived",
] as const;

/**
 * Whether an organizer write can change its defaults view. Creates and
 * deletes always evaluate; updates only when a read field changed.
 */
export function organizerWriteAffectsDefaultView(
  before: SourceData,
  after: SourceData
): boolean {
  if (!before || !after) return true;
  return eventSetupDefaultOrganizerFields.some((field) =>
    JSON.stringify(before[field] ?? null) !==
      JSON.stringify(after[field] ?? null));
}

const options = {retry: true, memory: "512MiB" as const};

export const onHostEventSetupDefaultViewDefaultsChanged = onDocumentWritten({
  ...options, document: "organizerEventSetupDefaults/{organizerId}",
}, async (event) => {
  await reconcileEventSetupDefaultView(admin.firestore(),
    event.params.organizerId);
});

/**
 * An organizer write that can change its defaults view.
 * Served by the organizers dispatcher (issue #2451); it re-reads its
 * sources, so a retry or a replay converges.
 */
export const hostEventSetupDefaultViewProjections = defineProjections(
  "organizers", [{
    id: "hostEventSetupDefaultView", kind: "projection",
    when: (change) => organizerWriteAffectsDefaultView(change.before,
      change.after),
    run: (change, ctx) => reconcileEventSetupDefaultView(ctx.db,
      change.documentId),
  }]);
