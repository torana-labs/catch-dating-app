import {runAssistanceTransaction as transact} from
  "../../platform/transactionCallback";
import {HttpsError} from "firebase-functions/v2/https";
import type {DocumentSnapshot, Firestore} from
  "firebase-admin/firestore";
import {operationCollections} from "../../operations/collections";
import {operationContentHash} from "../../operations/durableActions";
import {isOrganizerManager} from "../../shared/organizerHosts";
import type {OrganizerDocument} from
  "../../shared/generated/firestoreAdminTypes";
import type {EventAssistanceHostGuestsCallableResponse as Response} from
  "../../shared/generated/eventAssistanceHostGuestsCallableResponse";
import type {GetEventAssistanceHostGuestsCallablePayload as Input} from
  "../../shared/generated/getEventAssistanceHostGuestsCallablePayload";
import {validateOrganizerDocument} from
  "../../shared/generated/validators/organizerDocument";
import {validateEventAttendeeDocument} from
  "../../shared/generated/validators/eventAttendeeDocument";
import {validateGetEventAssistanceHostGuestsCallablePayload} from
  "../../shared/generated/validators/getEventAssistanceHostGuestsInput";
import {validateEventAssistanceHostGuestsCallableResponse} from
  "../../shared/generated/validators/eventAssistanceHostGuestsOutput";
import {invalidSource} from "./groupProgressSource";
import {currentGuest, guestCollections, guestIdentity,
  guestSourceFactsFromSnapshots, parseGuest} from "./guestRecords";
import {liveWorkIds, readLiveWorkRecords} from "./liveWorkRecords";
import {parseRuntimeConfig, RUNTIME_CONFIGS, RuntimeConfig, runtimeConfigId,
  runtimeConfigSource, runtimeConfigStatus} from "./runtimeConfigRecords";

type Row = Response["guests"][number];

/** Bounded current-episode read. Never enrolls, evaluates or sends messages. */
export class EventAssistanceHostGuestsStore {
  constructor(private readonly db: Firestore,
    private readonly clock: () => number = Date.now) {}

  async get(actorUid: string, value: unknown): Promise<Response> {
    if (!validateGetEventAssistanceHostGuestsCallablePayload(value)) {
      throw new HttpsError("invalid-argument",
        "Invalid assistance guest scope.");
    }
    const input = structuredClone(value);
    return transact(this.db, async (tx) => {
      // Check manager access before reading another organizer's roster/work.
      const organizer = (await tx.get(this.db.collection("organizers")
        .doc(input.context.organizerId))).data();
      if (!validateOrganizerDocument(organizer) ||
          !isOrganizerManager(organizer as unknown as OrganizerDocument,
            actorUid)) {
        throw new HttpsError("permission-denied",
          "Only an organizer manager can review guest assistance.");
      }
      const now = this.clock();
      const [eventSnap, planSnap, runtimeSnap, ...guestSnaps] = await tx.getAll(
        this.db.collection("events").doc(input.context.eventId),
        this.db.collection("eventSuccessPlans").doc(input.context.eventId),
        this.db.collection(RUNTIME_CONFIGS).doc(runtimeConfigId(input.context)),
        ...input.attendeeIds.flatMap((id) => [
          this.db.collection("eventAttendees").doc(id),
          this.db.collection(guestCollections.guests)
            .doc(guestIdentity(input.context, id)),
        ]));
      const source = runtimeConfigSource(input.context, eventSnap, planSnap,
        now);
      const runtime = runtimeSnap.exists ?
        parseRuntimeConfig(runtimeSnap.data(), input.context, now) : null;
      const guests = input.attendeeIds.map((id, index) => this.readGuest(
        input.context, id, eventSnap, guestSnaps[index * 2],
        guestSnaps[index * 2 + 1], now));
      const enrolled = guests.flatMap((row, index) => row.kind === "current" ?
        [{row, index, ids: liveWorkIds({context: input.context,
          attendeeId: row.attendeeId, episodeId: row.episodeId})}] : []);
      if (enrolled.length) {
        const workSnaps = await tx.getAll(...enrolled.flatMap(({ids}) => [
          this.db.collection(operationCollections.runs).doc(ids.runId),
          this.db.collection(operationCollections.workItems)
            .doc(ids.workItemId),
        ]));
        enrolled.forEach(({row, index}, i) => {
          guests[index] = this.readWork(input.context, row, runtime,
            workSnaps[i * 2], workSnaps[i * 2 + 1], now);
        });
      }
      const result: Response = {context: input.context, serverTime: now,
        coverage: "selectedAttendees", workflow: "lateJoin",
        runtimeStatus: runtimeConfigStatus(runtime, source, now), guests};
      if (!validateEventAssistanceHostGuestsCallableResponse(result)) {
        throw invalidSource();
      }
      return result;
    });
  }

  private readGuest(context: Input["context"], attendeeId: string,
    eventSnap: DocumentSnapshot, attendeeSnap: DocumentSnapshot,
    guestSnap: DocumentSnapshot, now: number): Row {
    const attendee = attendeeSnap.data();
    // A stale selected row must not reveal a foreign event or its guests.
    if (!attendee || attendee.eventId !== context.eventId ||
        attendee.organizerId !== context.organizerId) {
      return {kind: "unavailable", attendeeId};
    }
    if (!validateEventAttendeeDocument(attendee)) throw invalidSource();
    if (attendee.status !== "registered" && attendee.status !== "checkedIn") {
      return {kind: "ineligible", attendeeId, rosterStatus: attendee.status};
    }
    const checkedIn = attendee.status === "checkedIn";
    const guestId = guestIdentity(context, attendeeId);
    if (!guestSnap.exists) {
      return {kind: "uninitialized", attendeeId, checkedIn};
    }
    const guest = parseGuest(guestSnap.data());
    if (guest.guestId !== guestId || guest.updatedAt > now) {
      throw invalidSource();
    }
    const source = guestSourceFactsFromSnapshots(context, attendeeId,
      eventSnap, attendeeSnap);
    if (!currentGuest(guest, source)) {
      return {kind: "sourceChanged", attendeeId, checkedIn};
    }
    return {kind: "current", attendeeId, checkedIn,
      episodeId: guest.episodeId, participation: guest.participation,
      intention: guest.intention, work: {kind: "notEnrolled"}};
  }

  private readWork(context: Input["context"],
    row: Extract<Row, {kind: "current"}>, runtime: RuntimeConfig | null,
    runSnap: DocumentSnapshot, itemSnap: DocumentSnapshot, now: number): Row {
    if (!runSnap.exists && !itemSnap.exists) return row;
    const scope = {context, attendeeId: row.attendeeId,
      episodeId: row.episodeId};
    const ids = liveWorkIds(scope);
    const {run, item, payload} = readLiveWorkRecords(runSnap.data(),
      itemSnap.data(), ids.workItemId, now);
    if (operationContentHash(payload.scope) !== operationContentHash(scope)) {
      throw invalidSource();
    }
    const binding = payload.runtimeBinding;
    const configurationBinding = !binding ? "unbound" :
      runtime && binding.runtimeId === runtime.runtimeId &&
        binding.revision === runtime.revision && operationContentHash({
        options: payload.options, expiresAt: payload.expiresAt,
        maxEvaluations: payload.maxEvaluations}) ===
          operationContentHash(runtime.configuration) ?
        "current" : "configurationChanged";
    const checkpoint = payload.checkpoint;
    if (run.status !== "running" && run.status !== "paused" &&
        run.status !== "completed") throw invalidSource();
    return {...row, work: {kind: "recorded", revision: item.revision,
      runStatus: run.status,
      configurationBinding, expiresAt: payload.expiresAt,
      nextEvaluationAt: checkpoint.dueAt,
      lastEvaluation: checkpoint.observation === null ? null : {
        at: checkpoint.evaluatedAt!, observation: checkpoint.observation},
      publishedIntentCount: run.counters.published}};
  }
}
