import {createHash} from "crypto";
import {HttpsError} from "firebase-functions/v2/https";
import type {CreatePrivateEventSeriesCallablePayload as Command} from
  "../../shared/generated/createPrivateEventSeriesCallablePayload";
import type {PrivateEventSeriesCallableResponse as Result} from
  "../../shared/generated/privateEventSeriesCallableResponse";
import {validateCreatePrivateEventSeriesCallablePayload} from
  "../../shared/generated/validators/createPrivateEventSeriesInput";
import {authorizeSetupManager, createPrivateEventSetup,
  ProgressiveSetupDependencies} from "./service";

const weekdays = ["sunday", "monday", "tuesday", "wednesday", "thursday",
  "friday", "saturday"] as const;

/** The civil date `days` after `localDate` (YYYY-MM-DD), calendar only. */
export function addLocalDays(localDate: string, days: number): string {
  const [year, month, day] = localDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}

/** Stable per request, so a retry names the same series. */
export function seriesIdFor(actorUid: string, organizerId: string,
  requestId: string): string {
  return "series-" + createHash("sha256")
    .update(JSON.stringify([actorUid, organizerId, requestId]))
    .digest("hex").slice(0, 24);
}

/** Creates the weekly series one event at a time. Each event is an ordinary
 * createPrivateEventSetup with its own receipt under `${requestId}-${index}`,
 * so a retry after a partial failure replays the events already made and
 * creates only the rest; every event carries seriesId and seriesIndex.
 */
export async function createPrivateEventSeries(params: {
  actorUid: string;
  command: Command;
  deps: ProgressiveSetupDependencies;
}): Promise<Result> {
  const {actorUid, command, deps} = params;
  if (!validateCreatePrivateEventSeriesCallablePayload(command)) {
    throw new HttpsError("invalid-argument", "Invalid event series request.");
  }
  const first = command.template.localDate;
  const weekday = weekdays[new Date(`${first}T00:00:00Z`).getUTCDay()];
  if (weekday !== command.cadence.weekday) {
    throw new HttpsError("invalid-argument",
      "The first date is not on the series' weekday.");
  }
  const seriesId = seriesIdFor(actorUid, command.organizerId,
    command.requestId);
  // The event the series repeats is its first; the new ones count on.
  const offset = command.sourceEventId === undefined ? 0 : 1;
  if (command.sourceEventId !== undefined) {
    await tagSeriesSource({actorUid, deps, seriesId,
      organizerId: command.organizerId, eventId: command.sourceEventId});
  }
  const eventIds: string[] = [];
  let replayed = true;
  for (let index = 0; index < command.cadence.count; index++) {
    const result = await createPrivateEventSetup({actorUid, deps,
      series: {seriesId, seriesIndex: index + offset},
      command: {organizerId: command.organizerId,
        requestId: `${command.requestId}-${index}`,
        basics: {...command.template,
          localDate: addLocalDays(first, 7 * index)}}});
    eventIds.push(result.eventId);
    replayed = replayed && result.replayed;
  }
  return {seriesId, eventIds, replayed};
}

/** Tags the event a series repeats with the series and index 0, under the
 * current manager's authority. A retry finds it already tagged; an event
 * already in another series is refused. The tag is series metadata, not a
 * setup change, so the setup revision (which a publish in flight is fenced
 * by) stays as it is.
 */
async function tagSeriesSource(params: {
  actorUid: string;
  deps: ProgressiveSetupDependencies;
  seriesId: string;
  organizerId: string;
  eventId: string;
}): Promise<void> {
  const {actorUid, deps, seriesId, organizerId, eventId} = params;
  const {db} = deps;
  await db.runTransaction(async (tx) => {
    const eventRef = db.collection("events").doc(eventId);
    const [organizerSnap, deletedSnap, eventSnap] = await Promise.all([
      tx.get(db.collection("organizers").doc(organizerId)),
      tx.get(db.collection("deletedUsers").doc(actorUid)),
      tx.get(eventRef),
    ]);
    authorizeSetupManager(organizerSnap, deletedSnap, actorUid);
    const event = eventSnap.data();
    if (!event || event.organizerId !== organizerId) {
      throw new HttpsError("not-found", "Event not found.");
    }
    if (event.seriesId === seriesId && event.seriesIndex === 0) return;
    if (event.seriesId !== undefined) {
      throw new HttpsError("failed-precondition",
        "This event is already part of a series.");
    }
    if (event.status !== "active") {
      throw new HttpsError("failed-precondition",
        "Only an active event can start a series.");
    }
    tx.update(eventRef, {seriesId, seriesIndex: 0,
      updatedAt: deps.serverTimestamp()});
  });
}
