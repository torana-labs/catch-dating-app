import {FieldPath, Firestore} from "firebase-admin/firestore";
import {operationContentHash} from "../../operations/durableActions";
import {invalidWork} from "./liveWorkRecords";
import {parseRuntimeConfig, RUNTIME_CONFIGS} from "./runtimeConfigRecords";
import {parseWhatsappPermission, WHATSAPP_PERMISSIONS} from
  "./whatsappPermissionRecords";
import type {EventSourceScope, ReadinessSourceScope} from "./sourceWorkRecords";
import {parseRcsPermission, rcsConsentCollections} from "./rcsConsent";

/** Stable query tuple, retained even if the discovery document disappears. */
export function readinessTargetKey(expiresAt: number, documentId: string) {
  if (!Number.isSafeInteger(expiresAt) || expiresAt < 0) throw invalidWork();
  return "lookup:" + String(expiresAt).padStart(16, "0") + ":" + documentId;
}

export function parseReadinessTargetKey(key: string,
  scope: ReadinessSourceScope): [number, string] {
  const match = /^lookup:([0-9]{16}):(.+)$/.exec(key);
  const stamp = Number(match?.[1]);
  const id = match?.[2] ?? "";
  const pattern = scope.kind === "sender" ?
    /^runtime:lateJoin:[a-f0-9]{64}$/ : scope.kind === "rcsSubscription" ?
      /^rcs-permission:[a-f0-9]{64}$/ : /^wa-permission:[a-f0-9]{64}$/;
  if (!match || !pattern.test(id) || !Number.isSafeInteger(stamp) ||
      readinessTargetKey(stamp, id) !== key) throw invalidWork();
  return [stamp, id];
}

/** Discovery only; runtime, consent and send authority stay separate. */
export class SourceReadinessTargets {
  constructor(private readonly db: Firestore,
    private readonly clock: () => number) {}

  async list(scope: ReadinessSourceScope, occurredAt: number,
    cursor: string | null, limit: number) {
    if (!Number.isSafeInteger(occurredAt) || occurredAt < 0 ||
        !Number.isInteger(limit) || limit < 1 || limit > 21) {
      throw invalidWork();
    }
    const expiryField = scope.kind === "sender" ?
      "configuration.expiresAt" : "expiresAt";
    let query = scope.kind === "sender" ?
      this.db.collection(RUNTIME_CONFIGS).where("configuration.options.routes",
        "array-contains", {routeId: scope.routeId, senderId: scope.senderId}) :
      scope.kind === "rcsSubscription" ?
        this.db.collection(rcsConsentCollections.permissions)
          .where("channel", "==", "rcs")
          .where("subscriptionId", "==", scope.subscriptionId) :
        this.db.collection(WHATSAPP_PERMISSIONS)
          .where("channel", "==", "whatsapp")
          .where("context.organizerId", "==", scope.organizerId)
          .where("recipientEndpointId", "==", scope.recipientEndpointId);
    query = query.where(expiryField, ">", occurredAt).orderBy(expiryField)
      .orderBy(FieldPath.documentId());
    if (cursor !== null) {
      query = query.startAfter(...parseReadinessTargetKey(cursor, scope));
    }
    const result = await query.limit(limit).get();
    return result.docs.map((doc) => {
      const data = doc.data();
      return readinessTargetKey(scope.kind === "sender" ?
        data.configuration.expiresAt : data.expiresAt, doc.id);
    });
  }

  async resolve(scope: ReadinessSourceScope, key: string,
    occurredAt: number): Promise<EventSourceScope | null> {
    const [expiry, id] = parseReadinessTargetKey(key, scope);
    const snap = await this.db.collection(scope.kind === "sender" ?
      RUNTIME_CONFIGS : scope.kind === "rcsSubscription" ?
        rcsConsentCollections.permissions : WHATSAPP_PERMISSIONS)
      .doc(id).get();
    if (!snap.exists) return null;
    const value = snap.data()!;
    if (scope.kind === "sender") {
      const runtime = parseRuntimeConfig(value, value.context, this.clock());
      if (runtime.runtimeId !== id) throw invalidWork();
      const c = runtime.configuration;
      if (!c || c.expiresAt !== expiry ||
          c.expiresAt <= Math.max(occurredAt, this.clock()) ||
          !c.options.routes.some((r) => operationContentHash(r) ===
            operationContentHash({routeId: scope.routeId,
              senderId: scope.senderId}))) return null;
      return {context: runtime.context, attendeeId: null};
    }
    if (scope.kind === "rcsSubscription") {
      const permission = parseRcsPermission(value);
      if (permission.permissionId !== id ||
          permission.updatedAt > this.clock()) {
        throw invalidWork();
      }
      if (permission.expiresAt !== expiry ||
          permission.expiresAt <= Math.max(occurredAt, this.clock()) ||
          permission.subscriptionId !== scope.subscriptionId) return null;
      return {context: permission.context, attendeeId: permission.attendeeId};
    }
    const permission = parseWhatsappPermission(value);
    if (permission.permissionId !== id || permission.updatedAt > this.clock()) {
      throw invalidWork();
    }
    if (permission.expiresAt !== expiry ||
        permission.expiresAt <= Math.max(occurredAt, this.clock()) ||
        permission.context.organizerId !== scope.organizerId ||
        permission.recipientEndpointId !== scope.recipientEndpointId) {
      return null;
    }
    return {context: permission.context, attendeeId: permission.attendeeId};
  }
}
