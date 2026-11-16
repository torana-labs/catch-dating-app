import type {Response as ExpressResponse} from "express";
import type {Firestore} from "firebase-admin/firestore";
import type {MessageRecord} from "./messageOutbox";
import {harness, worker as whatsappWorker, keys, start} from
  "./whatsappTestHarness";
import {rcsTestConfig} from "./rcsTestFixtures";
import {RCS_CONSENT_VERSION, rcsConsentCollections, rcsPermissionId,
  parseRcsPermission} from "./rcsConsent";
import {RcsPreferenceStore} from "./rcsPreferenceStore";
import {RCS_BUDGETS, rcsBudgetId, rcsBudgetScopes, parseRcsBudget,
  parseRcsCapability} from "./rcsDispatchRecords";
import {RcsDispatchStore} from "./rcsDispatchStore";
import {EventRcsWorker, RcsCredentials} from "./rcsWorker";
import {GoogleRbmProvider} from "./googleRbmProvider";
import {EventMessageWorker} from "./messageWorker";
import {EventSmsWorker} from "./smsWorker";
import {SmsDispatchStore, smsBudgetId, smsBudgetScopes, smsCollections} from
  "./smsDispatchStore";
import {SmsPreferenceStore} from "./smsPreferenceStore";
import {GupshupSmsProvider} from "./gupshupSmsProvider";
import type {SmsConfig} from "./smsProtocol";
import {operationContentHash} from "../../operations/durableActions";

export async function rcsHarness(real?: Firestore, id = "rcs",
  routes: MessageRecord["intent"]["permittedRoutes"] =
  ["catchEventRcs", "catchEventSms", "organizerEventWhatsapp"],
  eventEnd = start + 3_600_000, privateRecipient = false) {
  const h = await harness(real, id, routes, eventEnd, privateRecipient);
  const sender: SmsConfig = {schemaVersion: 1, senderId: "sms-" + id,
    revision: 1, provider: "gupshup", senderIdentity: "catchPlatform",
    country: "IN", status: "ready", mask: "CATCHS",
    principalEntityId: "100100100100",
    credentialVersion: "projects/demo/secrets/SMS_FIXTURE/versions/1",
    activation: {useCaseApprovalId: "fixture", senderApprovalId: "fixture",
      approvedAt: start - 1000, validUntil: start + 3_600_000},
    maxSegments: 3, quote: {revision: 1, currency: "INR",
      maxMicrosPerSegment: 500_000, validUntil: start + 3_600_000},
    templates: [{templateId: "fixture-joining", revision: 1,
      purpose: "joiningUpdate", dltTemplateId: "100200200200",
      status: "approved", parts: [{kind: "literal", text: "Catch: "},
        {kind: "variable", name: "instruction", maxCharacters: 180},
        {kind: "literal", text: " Reply: "},
        {kind: "variable", name: "responseUrl", maxCharacters: 160}]}]};
  const smsSenderPath = smsCollections.senders + "/" + sender.senderId;
  await h.write(smsSenderPath, sender);
  const smsPreferences = new SmsPreferenceStore(h.db, () => h.clock.now,
    sender.senderId);
  const smsScope = {eventId: h.context.eventId,
    attendeeId: h.scope.attendeeId};
  const smsReview = (await smsPreferences.get(h.actor, smsScope)).view;
  await smsPreferences.set(h.actor, {...smsScope, requestId: "sms-grant",
    expectedReviewHash: smsReview.reviewHash,
    expectedRevision: null, decision: {kind: "grant",
      copyVersion: "catch-event-service-sms-v1"}});
  const smsBudgets: string[] = [];
  for (const scope of smsBudgetScopes(h.context, start)) {
    const begins = scope.kind === "senderDay" ?
      Date.parse(scope.day + "T00:00:00+05:30") : start - 1000;
    const budgetId = smsBudgetId(sender.senderId, scope);
    const path = smsCollections.budgets + "/" + budgetId;
    smsBudgets.push(path);
    await h.write(path, {schemaVersion: 1, budgetId, revision: 1,
      senderId: sender.senderId, scope, status: "active",
      approvalId: "fixture", currency: "INR", limitMicros: 10_000_000,
      chargedMicros: 0, startsAt: begins, endsAt: scope.kind === "senderDay" ?
        begins + 86_400_000 : start + 3_600_000, updatedAt: start});
  }
  const smsStore = new SmsDispatchStore(h.db, sender.senderId, keys,
    () => h.clock.now);
  const rcsConfig = rcsTestConfig();
  rcsConfig.senderId = "rcs-" + id;
  rcsConfig.activation.approvedAt = start - 1000;
  rcsConfig.activation.validUntil = start + 3_600_000;
  rcsConfig.quote.validUntil = start + 3_600_000;
  const rcsSenderPath = rcsConsentCollections.senders + "/" +
    rcsConfig.senderId;
  await h.write(rcsSenderPath, rcsConfig);
  const rcsPreferences = new RcsPreferenceStore(h.db, () => h.clock.now);
  const rcsScope = {...h.scope, senderId: rcsConfig.senderId};
  const enable = async (requestId = "rcs-grant") => {
    const {view} = await rcsPreferences.get(h.actor, rcsScope);
    return rcsPreferences.set(h.actor, {...rcsScope, requestId,
      expectedRevision: view.revision, decision: {kind: "grant",
        copyVersion: RCS_CONSENT_VERSION, reviewHash: view.reviewHash}});
  };
  await enable();
  const rcsPermissionPath = rcsConsentCollections.permissions + "/" +
    rcsPermissionId(h.context, h.scope.attendeeId, rcsConfig.senderId);
  const permission = async () => parseRcsPermission(
    await h.read(rcsPermissionPath));
  const rcsBudgetPaths: string[] = [];
  for (const scope of rcsBudgetScopes(h.context, start)) {
    const startsAt = scope.kind === "senderDay" ?
      Date.parse(scope.day + "T00:00:00Z") : start - 1000;
    const budget = parseRcsBudget({schemaVersion: 1, channel: "rcs", revision: 1,
      budgetId: rcsBudgetId(rcsConfig.senderId, scope),
      senderId: rcsConfig.senderId, agentId: rcsConfig.agentId,
      scope, status: "active", approvalId: "rcs-spending",
      currency: "INR", limitMicros: 2_000_000, chargedMicros: 0,
      startsAt, endsAt: scope.kind === "senderDay" ?
        startsAt + 86_400_000 : start + 3_600_000, updatedAt: start});
    const path = RCS_BUDGETS + "/" + budget.budgetId;
    rcsBudgetPaths.push(path);
    await h.write(path, budget);
  }
  const rcsStore = new RcsDispatchStore(h.db, rcsConfig.senderId, keys,
    () => h.clock.now);
  const credentials: RcsCredentials = {senderId: rcsConfig.senderId,
    agentId: rcsConfig.agentId, region: rcsConfig.region,
    credentialVersion: rcsConfig.credentialVersion,
    accessToken: "fixture-rcs-access-token", expiresAt: start + 3_600_000};
  const requests: Array<{method: string; url: string; body: string}> = [];
  const behavior = {capability: "reachable", send: "accepted",
    credentialMissing: false, supportsOpenUrl: true,
    afterCapability: async () => undefined as void,
    beforeSend: async () => undefined as void};
  const rcsProvider = new GoogleRbmProvider(async (url, init) => {
    requests.push({method: init!.method!, url: String(url),
      body: String(init!.body ?? "")});
    if (init!.method === "GET") {
      await behavior.afterCapability();
      if (behavior.capability === "unknown") throw new Error("fixture-lost");
      if (behavior.capability === "unreachable") {
        return Response.json({error: {code: 404, status: "NOT_FOUND"}},
          {status: 404});
      }
      return Response.json({features: behavior.supportsOpenUrl ?
        ["ACTION_OPEN_URL"] : []});
    }
    await behavior.beforeSend();
    if (behavior.send === "unknown") throw new Error("fixture-lost");
    if (behavior.send === "rejected") {
      return Response.json({error: {code: 404, status: "NOT_FOUND"}},
        {status: 404});
    }
    if (behavior.send === "conflict") return Response.json({}, {status: 409});
    const body = JSON.parse(init!.body as string);
    const messageId = new URL(String(url)).searchParams.get("messageId");
    return Response.json({name: "phones/" + h.actor.phone +
      "/agentMessages/" + messageId, expireTime: body.expireTime});
  }, () => h.clock.now);
  const rcs = new EventRcsWorker(rcsStore, {access: async () => {
    if (behavior.credentialMissing) throw new Error("fixture-secret-missing");
    return credentials;
  }}, rcsProvider, () => h.clock.now);
  const sms = new EventSmsWorker(smsStore, {access: async () => ({
    schema: "catch.event-sms-credential/v1", senderId: sender.senderId,
    userid: "1234", password: "fixture-only"})},
  new GupshupSmsProvider(async (url, init) => {
    requests.push({method: "SMS", url: String(url), body: String(init!.body)});
    return new Response("success|919999999999|1234-5678");
  }, () => h.clock.now), () => h.clock.now);
  const whatsapp = whatsappWorker(h, async (url, init) => {
    requests.push({method: "WA", url: String(url), body: String(init!.body)});
    return Response.json({messages: [{id: "wamid.fixture"}]});
  });
  const service = new EventMessageWorker(h.db, {rcs, sms, whatsapp},
    () => h.clock.now);
  const capability = async () => {
    const p = await permission();
    return parseRcsCapability({requestId:
      "12345678-1234-4234-8234-123456789012", senderId: rcsConfig.senderId,
    agentId: rcsConfig.agentId, configHash: operationContentHash(rcsConfig),
    permissionHash: operationContentHash(p),
    recipientEndpointId: p.recipientEndpointId, checkedAt: h.clock.now,
    validUntil: h.clock.now + 60_000, supportsOpenUrl: true});
  };
  const outbox = () => capability().then((cap) => rcsStore.outbox(h.link.linkId,
    rcsConfig, cap));
  const record = async () => (await h.outbox.get(h.messageId))!;
  const dispatch = () => service.dispatch(h.messageId, h.link.linkId);
  const revoke = () => rcsPreferences.set(h.actor, {...rcsScope,
    requestId: "rcs-stop", expectedRevision: 1, decision: {kind: "revoke"}});
  return {...h, rcsConfig, rcsSenderPath, rcsScope, rcsPermissionPath,
    rcsPreferences, rcsBudgetPaths, rcsStore, rcs, credentials, rcsProvider,
    requests, behavior, enable, permission, capability, rcsOutbox: outbox,
    dispatch, record, revoke, sms, smsBudgets, service};
}

export function rcsHttpResponse() {
  const replies: Array<{status: number; body: unknown}> = [];
  const headers: Record<string, string> = {};
  let code = 200;
  const response = {set: (value: Record<string, string> | string,
    second?: string) => {
    if (typeof value === "string") headers[value] = second!;
    else Object.assign(headers, value);
    return response;
  }, status: (value: number) => {
    code = value; return response;
  }, send: (body: unknown) => {
    replies.push({status: code, body}); return response;
  }};
  return {replies, headers, response: response as unknown as ExpressResponse};
}
