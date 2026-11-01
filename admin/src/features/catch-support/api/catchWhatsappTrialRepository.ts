import {getToken} from "firebase/app-check";
import type {HttpsCallableResult} from "firebase/functions";
import {auth} from "../../../shared/api/firebase";
import {adminAppCheck, firebaseApp} from "../../../shared/api/firebaseCore";
import {catchWhatsappSupportAvailable, refreshCatchWhatsappAvailability} from
  "./catchWhatsappAvailability";
import {loadAdminCallableValidators} from
  "../../../generated/validators/adminCallableValidators";
import type {CatchInboundReview, CatchReplyCommand, CatchReplyResult} from
  "../../../shared/contracts/catchWhatsappReplyContracts";

export interface CatchTrialScope {
  actorUid: string;
  projectId: string;
  sessionKey: string;
  isCurrent: () => boolean;
}
export interface CatchTrialApi {
  prepare(scope: CatchTrialScope): Promise<() => void>;
  review(eventId: string, scope: CatchTrialScope): Promise<CatchInboundReview>;
  send(command: Readonly<CatchReplyCommand>, scope: CatchTrialScope):
    Promise<CatchReplyResult>;
}

function assertScope(scope: CatchTrialScope, requireAvailability = true): void {
  if ((requireAvailability && !catchWhatsappSupportAvailable(scope)) || !scope.sessionKey ||
      !scope.isCurrent() || !scope.actorUid ||
      scope.actorUid !== auth.currentUser?.uid ||
      !adminAppCheck || !/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/u.test(scope.projectId) ||
      scope.projectId !== firebaseApp.options.projectId) {
    throw new Error("Support workspace is unavailable.");
  }
}
type Prepared = {assertCurrent: () => void; authToken: string; appToken: string};
const prepared = new WeakMap<CatchTrialScope, Prepared>();

async function call<Response>(name: string, payload: unknown,
  scope: CatchTrialScope): Promise<Response> {
  assertScope(scope);
  const {validateAdminCallableRequest, validateAdminCallableResponse} =
    await loadAdminCallableValidators(name);
  validateAdminCallableRequest(name, payload);
  const session = prepared.get(scope);
  prepared.delete(scope);
  if (!session) throw new Error("Current support session is required.");
  const body = JSON.stringify({data: payload});
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), 70000);
  try {
    // Use the callable HTTP protocol with already-resolved tokens. httpsCallable
    // performs another async token lookup after our guard, leaving a logout race.
    // No await may be introduced between this guard and the actual fetch.
    session.assertCurrent();
    const response = await fetch(
      `https://asia-south1-${scope.projectId}.cloudfunctions.net/${name}`, {
        method: "POST", body, signal: abort.signal, credentials: "omit",
        redirect: "error", cache: "no-store", referrerPolicy: "no-referrer",
        headers: {"Content-Type": "application/json",
          Authorization: `Bearer ${session.authToken}`,
          "X-Firebase-AppCheck": session.appToken},
      });
    session.assertCurrent();
    if (!response.ok) throw new Error("Unavailable.");
    const envelope: unknown = await response.json();
    session.assertCurrent();
    if (!envelope || typeof envelope !== "object" || Array.isArray(envelope) ||
        "error" in envelope) throw new Error("Unavailable.");
    const data = "data" in envelope ? envelope.data :
      "result" in envelope ? envelope.result : undefined;
    validateAdminCallableResponse(name, data);
    const result: HttpsCallableResult<Response> = {data: data as Response};
    return result.data;
  } catch {
    // No upstream response, token, private message or cause crosses this seam.
    throw new Error("Support action outcome is unavailable.");
  } finally {
    clearTimeout(timer);
  }
}

export const catchWhatsappTrialApi: CatchTrialApi = {
  async prepare(scope) {
    prepared.delete(scope);
    assertScope(scope, false);
    const user = auth.currentUser!;
    const [authToken, appToken, available] = await Promise.all([
      user.getIdToken(), getToken(adminAppCheck!, false),
      refreshCatchWhatsappAvailability(scope),
    ]);
    if (!available) throw new Error("Support workspace is unavailable.");
    const assertCurrent = () => {
      assertScope(scope);
      if (auth.currentUser !== user || !authToken || !appToken.token) {
        throw new Error("Current support session is required.");
      }
    };
    assertCurrent();
    prepared.set(scope, {assertCurrent, authToken, appToken: appToken.token});
    return assertCurrent;
  },
  review: (eventId, scope) => call(
    "adminReviewCatchWhatsappInbound",
    {purpose: "serviceSupport", inboundEventId: eventId}, scope),
  send: (command, scope) => call("adminSendCatchWhatsappReply", command, scope),
};
