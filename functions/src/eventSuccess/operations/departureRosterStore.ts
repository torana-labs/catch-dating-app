import {runAssistanceTransaction as transact} from
  "../../platform/transactionCallback";
import {HttpsError} from "firebase-functions/v2/https";
import type {Firestore} from "firebase-admin/firestore";
import type {EventAssistanceDepartureRosterCallableResponse as Response} from
  "../../shared/generated/eventAssistanceDepartureRosterCallableResponse";
import {validateGetEventAssistanceDepartureRosterCallablePayload} from
  "../../shared/generated/validators/getEventAssistanceDepartureRosterInput";
import {validateEventAssistanceDepartureRosterCallableResponse} from
  "../../shared/generated/validators/eventAssistanceDepartureRosterOutput";
import {requireGroupPermission, denied} from "./groupStaffAuthority";
import {readGroupProgressState} from "./groupProgressReader";
import {invalidSource} from "./groupProgressSource";
import {readDepartureRoster} from "./departureRosterSource";

/** Reviews an explicit selection without scanning the event roster. */
export class EventDepartureRosterStore {
  constructor(private readonly db: Firestore,
    private readonly clock: () => number = Date.now) {}

  async get(actorUid: string, input: unknown): Promise<Response> {
    if (!validateGetEventAssistanceDepartureRosterCallablePayload(input)) {
      throw new HttpsError("invalid-argument",
        "Invalid departure roster scope.");
    }
    return transact(this.db, async (tx) => {
      // Authorize before looking up any selected guest.
      const access = await requireGroupPermission(this.db, tx, input.context,
        input.groupId, actorUid, "readProgress", this.clock);
      const state = await readGroupProgressState(this.db, tx, input.context,
        input.groupId, this.clock);
      const roster = await readDepartureRoster(this.db, tx, state,
        input.attendeeIds);
      const now = this.clock();
      if (!Number.isSafeInteger(now) || now < state.now) throw invalidSource();
      if (now >= access.validUntil) throw denied();
      const value: Response = {context: input.context, groupId: input.groupId,
        serverTime: now, progressRevision: state.progress?.revision ?? 0,
        selection: {attendeeIds: roster.members.map((m) => m.attendeeId),
          expectedSourceHash: roster.sourceHash}};
      if (!validateEventAssistanceDepartureRosterCallableResponse(value)) {
        throw invalidSource();
      }
      return value;
    });
  }
}
