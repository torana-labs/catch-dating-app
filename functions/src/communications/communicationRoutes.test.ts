import assert from "node:assert/strict";
import test from "node:test";
import {communicationRoutes} from "./communicationRoutes";

test("the route registry covers every supported communication route", () => {
  assert.deepEqual(Object.keys(communicationRoutes).sort(), [
    "catchChat",
    "catchEventAnnouncement",
    "catchEventRcs",
    "catchEventSms",
    "catchProgramActivity",
    "catchWhatsapp",
    "organizerEventWhatsapp",
    "organizerFollowerUpdate",
    "organizerFollowerWhatsapp",
    "organizerProgramWhatsapp",
    "organizerWhatsappCampaign",
    "personalEmailHandoff",
    "personalWhatsappHandoff",
  ]);
});

test("organizer and Catch WhatsApp keep separate authority boundaries", () => {
  const organizer = communicationRoutes.organizerWhatsappCampaign;
  const catchPlatform = communicationRoutes.catchWhatsapp;

  assert.equal(organizer.transport, "whatsapp");
  assert.equal(catchPlatform.transport, "whatsapp");
  assert.notEqual(organizer.adapterKey, catchPlatform.adapterKey);
  assert.notEqual(organizer.senderIdentity, catchPlatform.senderIdentity);
  assert.notEqual(organizer.consentScope, catchPlatform.consentScope);
});

test("personal handoff remains host-sent and unobservable by Catch", () => {
  for (const handoff of [communicationRoutes.personalWhatsappHandoff,
    communicationRoutes.personalEmailHandoff]) {
    assert.equal(handoff.deliveryMode, "externalHandoff");
    assert.equal(handoff.audienceScope, "singleContact");
    assert.equal(handoff.observability, "none");
    assert.equal(handoff.requiresHostFinalSend, true);
    assert.equal(handoff.supportsScheduling, false);
  }
  assert.equal(
    communicationRoutes.personalEmailHandoff.transport,
    "email"
  );
});

test("every route declares audience, reply, and scheduling semantics", () => {
  assert.deepEqual(
    Object.values(communicationRoutes).map((route) => route.audienceScope),
    [
      "singleContact",
      "singleContact",
      "organizerCrmSegment",
      "catchPermissionedAudience",
      "linkedCatchAccount",
      "eventRoster",
      "organizerFollowers",
      "organizerFollowers",
      "eventRoster",
      "eventRoster",
      "eventRoster",
      "programGuests",
      "programGuests",
    ],
  );
  assert.equal(communicationRoutes.catchChat.supportsReplies, true);
  assert.equal(
    communicationRoutes.catchEventAnnouncement.supportsReplies,
    false,
  );
  assert.equal(
    communicationRoutes.organizerFollowerUpdate.supportsScheduling,
    false,
  );
  assert.equal(
    communicationRoutes.organizerWhatsappCampaign.supportsScheduling,
    true,
  );
});

test("automated event routes preserve service and sender boundaries", () => {
  for (const route of [communicationRoutes.catchEventSms,
    communicationRoutes.catchEventRcs,
    communicationRoutes.organizerEventWhatsapp]) {
    assert.equal(route.consentScope, "eventService");
    assert.equal(route.audienceScope, "eventRoster");
    assert.equal(route.requiresHostFinalSend, false);
    assert.equal(route.supportsScheduling, false);
  }
  assert.equal(communicationRoutes.catchEventSms.supportsReplies, false);
  assert.equal(communicationRoutes.organizerEventWhatsapp.senderIdentity,
    "organizerManaged");
  assert.equal(communicationRoutes.catchEventSms.senderIdentity,
    "catchPlatform");
});

test("program routes keep separate authority from event and campaign routes",
  () => {
    const program = communicationRoutes.organizerProgramWhatsapp;
    const event = communicationRoutes.organizerEventWhatsapp;
    const campaign = communicationRoutes.organizerWhatsappCampaign;
    assert.equal(program.transport, "whatsapp");
    assert.equal(program.senderIdentity, "organizerManaged");
    assert.equal(program.deliveryMode, "programService");
    assert.equal(program.audienceScope, "programGuests");
    assert.equal(program.consentScope, "programService");
    assert.notEqual(program.consentScope, event.consentScope);
    assert.notEqual(program.consentScope, campaign.consentScope);
    assert.equal(communicationRoutes.catchProgramActivity.transport,
      "catchApp");
    assert.equal(communicationRoutes.catchProgramActivity.observability,
      "catchActivity");
  });

test("follower WhatsApp keeps its own consent apart from push and campaigns",
  () => {
    const whatsapp = communicationRoutes.organizerFollowerWhatsapp;
    const push = communicationRoutes.organizerFollowerUpdate;
    const campaign = communicationRoutes.organizerWhatsappCampaign;
    assert.equal(whatsapp.transport, "whatsapp");
    assert.equal(whatsapp.adapterKey, campaign.adapterKey);
    assert.equal(whatsapp.audienceScope, push.audienceScope);
    assert.equal(whatsapp.deliveryMode, push.deliveryMode);
    assert.equal(whatsapp.consentScope, "followerUpdates");
    assert.notEqual(whatsapp.consentScope, push.consentScope);
    assert.notEqual(whatsapp.consentScope, campaign.consentScope);
    assert.equal(whatsapp.observability, "providerReceipts");
    assert.equal(whatsapp.supportsScheduling, false);
  });
