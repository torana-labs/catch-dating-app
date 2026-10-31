import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import {readFileSync} from "node:fs";
import {Firestore, Timestamp} from "firebase-admin/firestore";
import {operationContentHash} from "../../operations/durableActions";
import {harness, keys, start} from "./whatsappTestHarness";
import {LiveLateJoinPublisher} from "./liveLateJoinPublication";
import {EventAssistanceSettingsStore} from "./policySettingsStore";
import {suggestedTemplate, Template} from "./policySettings";
import {whatsappTemplateSnapshot} from "./whatsappTemplate";

export async function setup(realDb?: Firestore, id = randomUUID()) {
  const h = await harness(realDb, id);
  await h.write(h.attendeePath, {...JSON.parse(readFileSync(
    "../contracts/fixtures/valid/event_attendee_doc.json", "utf8")),
  ...await h.read(h.attendeePath), organizerId: h.context.organizerId,
  checkedInAt: null, checkedInBy: null, attendanceRevision: 0,
  updatedAt: Timestamp.fromMillis(start)});
  const settings = new EventAssistanceSettingsStore(h.db, () => h.clock.now);
  const settingScope = {context: h.context, groupId: "event:whole",
    workflowKind: "lateJoin"};
  const template = suggestedTemplate("lateJoin")!;
  assert.ok(template.kind === "lateJoin");
  template.setting = {kind: "enabled", authority: "executeWithinPolicy"};
  const configure = async (next: Template | "disabled") => {
    const view = (await settings.get("host-1", settingScope)).view;
    return settings.set("host-1", {...settingScope, requestId: randomUUID(),
      expectedRevision: view.ownRevision, expectedSourceHash: view.sourceHash,
      preference: next === "disabled" ? {kind: "disabled"} :
        {kind: "configured", template: next}});
  };
  await configure(template);
  // This approved template intentionally exposes one of the three choices;
  // the response URL still exposes all canonical options.
  const approvedTemplate = {...await h.read(h.templatePath),
    buttonLabels: ["I'm on my way"]};
  await h.write(h.templatePath, approvedTemplate);
  const policy = {...h.expected.policy, templates: h.expected.policy.templates
    .map((t) => ({...t, templateHash: operationContentHash(
      whatsappTemplateSnapshot(approvedTemplate)),
    quickReplies: t.quickReplies.map((r) =>
      ({...r, choiceId: "on-my-way", label: "I'm on my way"}))}))};
  await h.write(h.policyPath, policy);
  const scope = {context: h.context, attendeeId: h.scope.attendeeId,
    episodeId: h.intent.episodeId};
  const options = {routes: [{routeId: "organizerEventWhatsapp" as const,
    senderId: h.scope.senderId}], responseDeadline: null,
  deliveryPolicy: {maxAttempts: 3, maxAttemptsPerRoute: 3,
    minimumRetrySeconds: 1}};
  const publisher = new LiveLateJoinPublisher(h.db, () => h.clock.now);
  const publish = () => publisher.publish(scope, options);
  const publishReady = async () => {
    const result = await publish();
    assert.ok(result.kind === "published", JSON.stringify(result));
    return result;
  };
  const delivery = async (published:
    Awaited<ReturnType<typeof publishReady>>) => {
    const link = await h.guests.issueLink(published.thread.threadId,
      "automatic", keys);
    const outbox = h.store.outbox(link.linkId);
    const reserve = () => outbox.reserve(published.messageId);
    const claim = async () => {
      const reservation = await reserve();
      const attempt = reservation.record.attempts.at(-1);
      assert.ok(attempt, JSON.stringify(reservation.decision));
      return outbox.claimLiveDispatch(published.messageId, attempt.attemptId,
        h.store.prepare(link.linkId, (await h.store.sender())!));
    };
    return {link, outbox, reserve, claim};
  };
  return {...h, options, scope, publisher, publish, publishReady, delivery,
    configure, template};
}
