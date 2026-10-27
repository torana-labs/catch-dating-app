import * as admin from "firebase-admin";
import {
  HttpsError,
  onCall,
  type CallableRequest,
} from "firebase-functions/v2/https";
import {appCheckCallableOptionsWithLimits} from "../../shared/callableOptions";
import {requireAuth} from "../../shared/auth";
import {checkRateLimit} from "../../shared/rateLimit";
import {validateCallableWithAjv} from "../../shared/validation";
import {operationContentHash as hash} from "../../operations/durableActions";
import {validateManageEventApprovalNotificationsCallablePayload} from
  "../../shared/generated/validators/manageEventApprovalNotificationsInput";
import {
  validateEventApprovalPreferenceDocument as validPreference,
} from
  "../../shared/generated/validators/eventApprovalPreferenceDocument";
import {validateEventApprovalNotificationSettingsDocument as validSettings} from
  "../../shared/generated/validators/eventApprovalNotificationSettingsDocument";
import type {ManageEventApprovalNotificationsCallableResponse as Result} from
  "../../shared/generated/manageEventApprovalNotificationsCallableResponse";
import type {EventApprovalPreferenceDocument as Preference} from
  "../../shared/generated/eventApprovalPreferenceDocument";
import {loadIdentity, readApplication, type LoadIdentity} from "./source";
import {preferenceId, terms} from "./model";
export const preferences = "eventApprovalNotificationPreferences";
export const receipts = "eventApprovalNotificationReceipts";
export const settings = "eventApprovalNotificationSettings";
interface Deps {
  db: () => FirebaseFirestore.Firestore;
  now: () => number;
  identity: LoadIdentity;
  rateLimit: typeof checkRateLimit;
}
const defaults: Deps = {
  db: () => admin.firestore(),
  now: Date.now,
  identity: loadIdentity,
  rateLimit: checkRateLimit,
};
export async function manageEventApprovalNotificationsHandler(
  request: CallableRequest<unknown>,
  deps: Deps = defaults,
): Promise<Result> {
  const uid = requireAuth(request);
  const data = validateCallableWithAjv(
    request,
    validateManageEventApprovalNotificationsCallablePayload,
  );
  if (data.expectedUid !== uid) throw denied();
  const db = deps.db();
  await deps.rateLimit(db, uid, "manageEventApprovalNotifications", {
    maxRequests: 30, windowMs: 60 * 1000,
  });
  const identity = await deps.identity(uid);
  if (!identity || identity.disabled || identity.uid !== uid) {
    throw denied();
  }
  const phone =
    identity.phoneNumber &&
    /^\+[1-9][0-9]{6,14}$/.test(identity.phoneNumber) ?
      identity.phoneNumber :
      null;
  const email =
    identity.emailVerified && identity.email ? identity.email : null;
  return db.runTransaction(async (tx) => {
    const id = preferenceId(data.eventId, uid);
    const ref = db.collection(preferences).doc(id);
    const snap = await tx.get(ref);
    const old = snap.data();
    if (
      snap.exists &&
      (!validPreference(old) ||
        old.uid !== uid ||
        old.eventId !== data.eventId)
    ) {
      throw denied();
    }
    const previous = snap.exists ? (old as Preference) : null;
    const applicationRows = await tx.get(
      db
        .collection("organizerApplications")
        .where("linkedUid", "==", uid)
        .where("targetId", "==", data.eventId)
        .orderBy("submittedAt", "desc")
        .limit(1),
    );
    const source = applicationRows.docs[0] ?
      await readApplication(
        db,
        tx,
        applicationRows.docs[0].id,
        uid,
        data.eventId,
        deps.now(),
      ) :
      null;
    const organizerId =
      source?.application.organizerId ?? previous?.organizerId;
    if (!organizerId) throw denied();
    const configuration = (
      await tx.get(db.collection(settings).doc(organizerId))
    ).data();
    const choices = previous?.choices ?? {
      phoneUpdates: false,
      emailUpdates: false,
    };
    const projection = (revision: number, selected = choices): Result => ({
      eventId: data.eventId,
      revision,
      choices: selected,
      phoneVerified: Boolean(phone),
      emailVerified: Boolean(email),
      terms,
      available: validSettings(configuration) && configuration.enabled,
    });
    if (data.action === "get") return projection(previous?.revision ?? 0);
    if (
      !data.choices ||
      data.expectedRevision === undefined ||
      data.termsVersion !== terms.version
    ) {
      throw new HttpsError(
        "invalid-argument",
        "Review the notification choices.",
      );
    }
    if (
      (data.choices.phoneUpdates && !phone) ||
      (data.choices.emailUpdates && !email)
    ) {
      throw new HttpsError(
        "failed-precondition",
        "Verify the selected contact method on this account first.",
      );
    }
    // Withdrawal remains possible after an event or application becomes closed.
    if (
      !source &&
      (data.choices.phoneUpdates || data.choices.emailUpdates)
    ) {
      throw denied();
    }
    const unchanged =
      hash(data.choices) === hash(choices) &&
      (!data.choices.phoneUpdates || previous?.phoneE164 === phone) &&
      (!data.choices.emailUpdates || previous?.email === email);
    if (
      previous &&
      unchanged &&
      [previous.revision, previous.revision - 1].includes(
        data.expectedRevision,
      )
    ) {
      return projection(previous.revision);
    }
    if (data.expectedRevision !== (previous?.revision ?? 0)) {
      throw new HttpsError(
        "aborted",
        "Notification choices changed. Reload.",
      );
    }
    const revision = (previous?.revision ?? 0) + 1;
    const receiptId = "eapr_" + hash([id, revision]);
    const next: Preference = {
      eventId: data.eventId,
      organizerId,
      uid,
      revision,
      choices: data.choices,
      phoneE164: data.choices.phoneUpdates ? phone : null,
      email: data.choices.emailUpdates ? email : null,
      termsVersion: terms.version,
      receiptId,
      updatedAtMillis: deps.now(),
    };
    if (!validPreference(next)) {
      throw new HttpsError(
        "failed-precondition",
        "Contact details are unavailable.",
      );
    }
    tx.create(db.collection(receipts).doc(receiptId), next);
    tx.set(ref, next);
    return projection(revision, data.choices);
  });
}
function denied() {
  return new HttpsError(
    "permission-denied",
    "Application notifications are unavailable for this account.",
  );
}
export const manageEventApprovalNotifications = onCall(
  appCheckCallableOptionsWithLimits({timeoutSeconds: 30, maxInstances: 10}),
  (request) => manageEventApprovalNotificationsHandler(request),
);
