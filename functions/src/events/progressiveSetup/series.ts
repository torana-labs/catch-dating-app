import {createHash} from "crypto";
import {HttpsError} from "firebase-functions/v2/https";
import type {CreatePrivateEventSeriesCallablePayload as Command} from
  "../../shared/generated/createPrivateEventSeriesCallablePayload";
import type {PrivateEventSeriesCallableResponse as Result} from
  "../../shared/generated/privateEventSeriesCallableResponse";
import {validateCreatePrivateEventSeriesCallablePayload} from
  "../../shared/generated/validators/createPrivateEventSeriesInput";
import {createPrivateEventSetup, ProgressiveSetupDependencies} from
  "./service";

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
  const eventIds: string[] = [];
  let replayed = true;
  for (let index = 0; index < command.cadence.count; index++) {
    const result = await createPrivateEventSetup({actorUid, deps,
      series: {seriesId, seriesIndex: index},
      command: {organizerId: command.organizerId,
        requestId: `${command.requestId}-${index}`,
        basics: {...command.template,
          localDate: addLocalDays(first, 7 * index)}}});
    eventIds.push(result.eventId);
    replayed = replayed && result.replayed;
  }
  return {seriesId, eventIds, replayed};
}
