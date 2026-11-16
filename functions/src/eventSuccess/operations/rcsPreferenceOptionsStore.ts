import {messageRecipientMatches} from "./messageRecipient";
import {FieldPath, Firestore} from "firebase-admin/firestore";
import {HttpsError} from "firebase-functions/v2/https";
import type {ListEventRcsPreferencesCallablePayload as Scope} from
  "../../shared/generated/listEventRcsPreferencesInput";
import type {ListEventRcsPreferencesCallableResponse as Response} from
  "../../shared/generated/listEventRcsPreferencesOutput";
import {requireDocumentId} from "./guestRecords";
import {readMessagePreferenceDiscovery, messagePreferenceClock} from
  "./messagePreferenceDiscovery";
import {parseRcsPermission, rcsConsentCollections} from "./rcsConsent";
import {runAssistanceTransaction} from "./transactionCallback";

const pageSize = 50;

/** Discovers saved senders, never consent, readiness or dispatch authority. */
export class RcsPreferenceOptionsStore {
  constructor(private readonly db: Firestore,
    private readonly clock: () => number = Date.now) {}

  async list(uid: string, scope: Scope): Promise<Response> {
    [uid, scope.eventId, scope.attendeeId].forEach(requireDocumentId);
    if (scope.cursor !== null &&
        !/^rcs-permission:[a-f0-9]{64}$/.test(scope.cursor)) {
      throw new HttpsError("invalid-argument", "Invalid preference cursor.");
    }
    return runAssistanceTransaction(this.db, async (tx) => {
      const now = messagePreferenceClock(this.clock());
      const {context, source, phone, routes} =
        await readMessagePreferenceDiscovery(this.db, tx, uid, scope, now);
      const route = routes.find((r) => r.routeId === "catchEventRcs");
      const configuredSenderId = route?.senderId ?? null;
      // The index checker consumes this declaration as one line.
      // eslint-disable-next-line max-len
      // firestore-index: eventAssistancePermissions (channel:ASCENDING, context.mode:ASCENDING, context.organizerId:ASCENDING, context.eventId:ASCENDING, attendeeId:ASCENDING, subjectUid:ASCENDING, __name__:ASCENDING)
      let query = this.db.collection(rcsConsentCollections.permissions)
        .where("channel", "==", "rcs")
        .where("context.mode", "==", "live")
        .where("context.organizerId", "==", context.organizerId)
        .where("context.eventId", "==", context.eventId)
        .where("attendeeId", "==", scope.attendeeId)
        .where("subjectUid", "==", uid)
        .orderBy(FieldPath.documentId()).limit(pageSize + 1);
      if (scope.cursor) query = query.startAfter(scope.cursor);
      const snapshot = await tx.get(query);
      const scanned = snapshot.docs.slice(0, pageSize);
      const previous = new Set<string>();
      for (const doc of scanned) {
        const permission = parseRcsPermission(doc.data());
        if (permission.permissionId !== doc.id ||
            permission.context.eventId !== context.eventId ||
            permission.context.organizerId !== context.organizerId ||
            permission.attendeeId !== scope.attendeeId ||
            permission.subjectUid !== uid || permission.updatedAt > now) {
          throw new HttpsError("internal", "RCS preference identity invalid.");
        }
        if (permission.senderId !== configuredSenderId &&
            permission.sourceGeneration === source.sourceGeneration &&
            permission.attendeeGeneration === source.attendeeGeneration &&
            messageRecipientMatches(permission.recipientBinding, {
              rosterPhone: phone, linkedUid: uid,
              sourceGeneration: source.sourceGeneration,
            }, (value) => value === permission.phoneE164)) {
          previous.add(permission.senderId);
        }
      }
      const serverTime = messagePreferenceClock(this.clock());
      if (serverTime < now) {
        throw new HttpsError("unavailable", "RCS preference clock is behind.");
      }
      return {eventId: scope.eventId, attendeeId: scope.attendeeId, serverTime,
        configuredSenderId, previousSenderIds: [...previous],
        // Advance by scanned rows, including ones filtered after source repair.
        nextCursor: snapshot.docs.length > pageSize ?
          scanned[scanned.length - 1].id : null};
    });
  }
}
