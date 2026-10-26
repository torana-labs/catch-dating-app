import {getAuth, UserRecord} from "firebase-admin/auth";
import {getFirestore} from "firebase-admin/firestore";
import {CallableRequest, HttpsError, onCall} from "firebase-functions/v2/https";
import {requireAuth} from "../../shared/auth";
import {appCheckCallableOptions} from "../../shared/callableOptions";
import {checkRateLimit, RateLimitConfig} from "../../shared/rateLimit";
import {eventStaffDisplayName, resolveStaffAuthUser} from
  "../../events/eventStaff";
import {normalizeRosterPhone} from "../../events/eventAttendees";
import {validateGetEventAssistanceGroupStaffCallablePayload} from
  "../../shared/generated/validators/getEventAssistanceGroupStaffInput";
import {validateSetEventAssistanceGroupStaffCallablePayload} from
  "../../shared/generated/validators/setEventAssistanceGroupStaffInput";
import {EventGroupStaffStore, StaffIdentity} from "./groupStaffStore";

import type {SetEventAssistanceGroupStaffCallablePayload as Data} from
  "../../shared/generated/setEventAssistanceGroupStaffCallablePayload";
interface Dependencies {
  db: typeof getFirestore;
  rateLimit: typeof checkRateLimit;
  lookup: (phone: string) => Promise<UserRecord>;
  store: (db: ReturnType<typeof getFirestore>) =>
    Pick<EventGroupStaffStore, "authorizeManager" | "get" | "set">;
}
const defaults: Dependencies = {db: getFirestore, rateLimit: checkRateLimit,
  lookup: (phone) => getAuth().getUserByPhoneNumber(phone),
  store: (db) => new EventGroupStaffStore(db)};

async function prepare(request: CallableRequest<unknown>, action: string,
  limit: RateLimitConfig, deps: Dependencies,
  input: Pick<Data, "context" | "groupId" | "phoneNumber">) {
  const actor = requireAuth(request);
  const db = deps.db();
  await deps.rateLimit(db, actor, action, limit);
  const scope = {context: input.context, groupId: input.groupId};
  const store = deps.store(db);
  await store.authorizeManager(actor, scope);
  const phone = normalizeRosterPhone(input.phoneNumber);
  if (!phone.value || phone.issue) {
    throw new HttpsError("invalid-argument",
      "Enter a valid staff phone number.");
  }
  const user = await resolveStaffAuthUser(deps.lookup, phone.value);
  if (user.disabled) {
    throw new HttpsError("failed-precondition",
      "This staff account is disabled.");
  }
  const target: StaffIdentity = {uid: user.uid,
    displayName: eventStaffDisplayName(user).slice(0, 120),
    phoneLastFour: phone.value.slice(-4)};
  return {actor, store, scope, target};
}

export async function getEventAssistanceGroupStaffHandler(
  request: CallableRequest<unknown>, deps: Dependencies = defaults
) {
  requireAuth(request);
  if (!validateGetEventAssistanceGroupStaffCallablePayload(request.data)) {
    throw new HttpsError("invalid-argument", "Invalid group staff scope.");
  }
  const {actor, store, scope, target} = await prepare(request,
    "getEventAssistanceGroupStaff", {maxRequests: 60, windowMs: 60_000},
    deps, request.data);
  return store.get(actor, target, scope);
}

export async function setEventAssistanceGroupStaffHandler(
  request: CallableRequest<unknown>, deps: Dependencies = defaults
) {
  requireAuth(request);
  if (!validateSetEventAssistanceGroupStaffCallablePayload(request.data)) {
    throw new HttpsError("invalid-argument", "Invalid group duty change.");
  }
  const {actor, store, target} = await prepare(request,
    "setEventAssistanceGroupStaff", {maxRequests: 30, windowMs: 60_000},
    deps, request.data);
  return store.set(actor, target, request.data);
}

export const getEventAssistanceGroupStaff = onCall(appCheckCallableOptions,
  (request) => getEventAssistanceGroupStaffHandler(request));
export const setEventAssistanceGroupStaff = onCall(appCheckCallableOptions,
  (request) => setEventAssistanceGroupStaffHandler(request));
