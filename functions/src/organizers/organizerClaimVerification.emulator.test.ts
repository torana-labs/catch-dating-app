import {getEmulatorFirestore} from "../shared/testing/emulatorFirestore";
import assert from "node:assert/strict";
import {createHmac} from "node:crypto";
import test from "node:test";
import {deleteApp, initializeApp} from "firebase-admin/app";
import {FieldValue} from "firebase-admin/firestore";
import type {CallableRequest} from "firebase-functions/v2/https";
import {checkRateLimit} from "../shared/rateLimit";
import {handleInstagramClaimWebhook} from "./instagramClaimProtocol";
import {FakeInstagramProvider} from "./instagramMessagingProvider";
import {FakeLumaClaimPageReader} from "./lumaClaimPage";
import {organizerClaimRequestId} from "./organizerClaimApproval";
import {
  confirmOrganizerClaimVerificationHandler,
  processInstagramClaimMessages,
  startOrganizerClaimVerificationHandler,
} from "./organizerClaimVerification";
import type {InstagramClaimMessageDeps} from "./organizerClaimVerification";
import {BRAND} from "../shared/generated/brand";

const emulator = process.env.FIRESTORE_EMULATOR_HOST;
const webhook = {accountId: "17841400000000001", appSecret: "emulator-secret",
  verifyToken: "v".repeat(32)};

function signedDelivery(mid: string, senderId: string, text: string) {
  const rawBody = Buffer.from(JSON.stringify({object: "instagram", entry: [{
    id: webhook.accountId, time: Date.now(), messaging: [{
      sender: {id: senderId}, recipient: {id: webhook.accountId},
      timestamp: Date.now(), message: {mid, text}}]}]}));
  return {method: "POST", query: {}, rawBody, signature: "sha256=" +
    createHmac("sha256", webhook.appSecret).update(rawBody).digest("hex")};
}

test("a signed Instagram message claims the listing end to end",
  {skip: !emulator}, async () => {
    const suffix = Date.now().toString();
    const organizerId = `claim-organizer-${suffix}`;
    const uid = `claim-owner-${suffix}`;
    const ownerSender = `90${suffix}`;
    const otherSender = `91${suffix}`;
    const app = initializeApp({projectId: "demo-catch-claims"}, uid);
    const db = getEmulatorFirestore(app);
    const provider = new FakeInstagramProvider({
      [ownerSender]: "carterroadrunners",
      [otherSender]: "someoneelse",
    });
    const deps: InstagramClaimMessageDeps = {
      firestore: () => db,
      serverTimestamp: () => FieldValue.serverTimestamp(),
      now: () => Date.now(),
      config: () => ({instagramEnabled: true,
        catchInstagramHandle: BRAND.social.instagramHandle}),
      randomCode: () => String(Math.floor(Math.random() * 1_000_000))
        .padStart(6, "0"),
      checkRateLimit,
      provider: () => provider,
      lumaPages: () => new FakeLumaClaimPageReader(),
    };
    const deliver = (mid: string, sender: string, text: string) =>
      handleInstagramClaimWebhook(signedDelivery(mid, sender, text), webhook,
        (messages) => processInstagramClaimMessages(messages, deps));
    try {
      await db.doc(`organizers/${organizerId}`).set({
        name: "Carter Road Runners", instagramHandle: "@CarterRoadRunners",
        ownership: {state: "programmatic"},
        claim: {state: "unclaimed", claimHref: null, lastClaimRequestId: null},
        provenance: {origin: "import"}, publicSources: [],
      });
      await db.doc(`users/${uid}`).set({name: "Asha Rao",
        displayName: "Asha Rao", phoneNumber: "+919800000001",
        profileComplete: false});
      const started = await startOrganizerClaimVerificationHandler({
        auth: {uid, token: {}}, rawRequest: {headers: {}},
        data: {organizerId, method: "instagramMessage"},
      } as unknown as CallableRequest<unknown>, deps);

      // The wrong account is refused and the page learns why.
      assert.equal((await deliver(`m1-${suffix}`, otherSender,
        started.code)).status, 200);
      const refused = (await db.doc(
        `organizerClaimVerifications/${started.attemptId}`).get()).data();
      assert.equal(refused?.status, "awaitingProof");
      assert.equal(refused?.lastRejection.reason, "wrongSender");

      // The listing's own account claims it, and a redelivery is a no-op.
      const display = `${started.code.slice(0, 3)} ${started.code.slice(3)}`;
      assert.equal((await deliver(`m2-${suffix}`, ownerSender, display))
        .status, 200);
      assert.equal((await deliver(`m2-${suffix}`, ownerSender, display))
        .status, 200);
      const organizer = (await db.doc(`organizers/${organizerId}`).get())
        .data();
      assert.equal(organizer?.ownerUserId, uid);
      assert.equal(organizer?.ownership.state, "claimed");
      const request = (await db.doc(`organizerClaimRequests/${
        organizerClaimRequestId(organizerId, uid)}`).get()).data();
      assert.equal(request?.status, "approved");
      assert.equal(request?.decidedByUid, null);
      const attempt = (await db.doc(
        `organizerClaimVerifications/${started.attemptId}`).get()).data();
      assert.equal(attempt?.status, "verified");
      assert.equal(attempt?.evidence.observedIdentity, "carterroadrunners");
      assert.deepEqual(provider.replies.map((reply) => reply.recipientId),
        [otherSender, ownerSender]);

      // The used code is refused from then on.
      await deliver(`m3-${suffix}`, ownerSender, started.code);
      assert.match(provider.replies[2].text, /used or replaced/);
    } finally {
      await deleteApp(app);
    }
  });

test("a code on the listing's Luma calendar claims it end to end",
  {skip: !emulator}, async () => {
    const suffix = Date.now().toString();
    const organizerId = `luma-organizer-${suffix}`;
    const uid = `luma-owner-${suffix}`;
    const calendar = `https://luma.com/harbour-line-${suffix}`;
    const app = initializeApp({projectId: "demo-catch-claims"}, uid);
    const db = getEmulatorFirestore(app);
    const lumaPages = new FakeLumaClaimPageReader();
    const deps: InstagramClaimMessageDeps = {
      firestore: () => db,
      serverTimestamp: () => FieldValue.serverTimestamp(),
      now: () => Date.now(),
      config: () => ({instagramEnabled: false, catchInstagramHandle: null}),
      randomCode: () => String(Math.floor(Math.random() * 1_000_000))
        .padStart(6, "0"),
      checkRateLimit,
      provider: () => new FakeInstagramProvider(),
      lumaPages: () => lumaPages,
    };
    const call = (data: unknown) => ({auth: {uid, token: {}},
      rawRequest: {headers: {}}, data}) as unknown as CallableRequest<unknown>;
    try {
      await db.doc(`organizers/${organizerId}`).set({
        name: "Harbour Line Run Club", instagramHandle: null,
        ownership: {state: "programmatic"},
        claim: {state: "unclaimed", claimHref: null, lastClaimRequestId: null},
        provenance: {origin: "import"}, publicSources: [{type: "luma",
          label: "luma page", detail: "Public luma page.", href: calendar,
          confidence: "medium", lastCheckedAt: null}],
      });
      await db.doc(`users/${uid}`).set({name: "Ravi Menon",
        displayName: "Ravi Menon", phoneNumber: "+919800000002",
        profileComplete: false});
      const started = await startOrganizerClaimVerificationHandler(
        call({organizerId, method: "lumaDescription"}), deps);
      lumaPages.pages[calendar] = "Weekly runs along the harbour.";
      const missing = await confirmOrganizerClaimVerificationHandler(
        call({attemptId: started.attemptId}), deps);
      assert.equal(missing.lastRejection, "codeNotFound");
      lumaPages.pages[calendar] =
        `Weekly runs along the harbour. ${started.proofText}`;
      const verified = await confirmOrganizerClaimVerificationHandler(
        call({attemptId: started.attemptId}), deps);
      assert.equal(verified.status, "verified");
      const organizer = (await db.doc(`organizers/${organizerId}`).get())
        .data();
      assert.equal(organizer?.ownerUserId, uid);
      const request = (await db.doc(`organizerClaimRequests/${
        organizerClaimRequestId(organizerId, uid)}`).get()).data();
      assert.equal(request?.status, "approved");
      assert.deepEqual(request?.proofUrls, [calendar]);
    } finally {
      await deleteApp(app);
    }
  });
