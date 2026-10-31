import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import type {CallableRequest} from "firebase-functions/v2/https";
import {createFormPaymentFixture} from
  "../payments/formPayments/formPaymentTestStore";
import {claimParticipantFormProfileHandler as claim,
  getParticipantFormProfileHandler as review, reviewedUserProfile} from
  "./claimFormProfile";
import {listParticipantFormProfilesHandler as list} from "./listFormProfiles";
import {updateUserProfileHandler} from "./updateUserProfile";
import type {ClaimParticipantFormProfileCallablePayload as Payload} from
  "../shared/generated/claimParticipantFormProfileCallablePayload";
import type {ProfilePhoto} from "../shared/generated/firestoreAdminTypes";
import type {GetParticipantFormProfileCallableResponse} from
  "../shared/generated/getParticipantFormProfileCallableResponse";
import {contractValidator} from "../shared/contractTestValidators";

const validateGetParticipantFormProfileCallableResponse =
  contractValidator<GetParticipantFormProfileCallableResponse>(
    "GetParticipantFormProfileCallableResponse"
  );

const now = Timestamp.fromDate(new Date("2026-09-23T12:00:00Z"));
const profile: Payload["profile"] = {displayName: "Sara Demo",
  dateOfBirth: "1994-06-15", gender: "woman"};
const photo: ProfilePhoto = {id: "owned-photo", position: 0,
  url: "https://example.test/owned.jpg",
  thumbnailUrl: "https://example.test/owned-thumb.jpg",
  storagePath: "users/person/photos/owned-photo.jpg",
  thumbnailStoragePath: "users/person/photoThumbnails/owned-photo.jpg",
  createdAt: now, updatedAt: now};

async function fixture(withPhoto = false, withEventAudience = false) {
  const h = createFormPaymentFixture();
  const questions = h.version.definition.sections[0].questions;
  questions[0].answerDestination = "catchProfile";
  questions.push({...questions[0], questionId: "cocktail", key: "cocktail",
    required: false, canonicalFieldId: null,
    answerDestination: "organizerCard",
    ...(withEventAudience ? {answerAudience: {
      mode: "eventMembersWithConsent" as const,
      eventProfileSlot: "customRow" as const}} : {})});
  if (withEventAudience) {
    h.version.definition.eventProfile = {enabled: true,
      allowedSlots: ["customRow"], maxCustomRows: 1,
      noticeVersion: "event-profile-sharing-v2"};
  }
  questions.push({...questions[0], questionId: "crm", key: "crm",
    required: false, canonicalFieldId: null,
    answerDestination: "organizerOnly"});
  if (withPhoto) {
    questions.push({...questions[0], questionId: "photo",
      key: "photo", canonicalFieldId: "profilePhoto", kind: "file",
      validation: {...questions[0].validation, maxFileCount: 1,
        maxFileSizeBytes: 10 * 1024 * 1024, allowedMimeTypes: ["image/jpeg"]}});
  }
  h.draft.answers = {name: "Sara Demo", cocktail: "Tequila", crm: "Private",
    ...(withPhoto ? {photo: ["asset"]} : {})};
  h.store.records.set("organizerFormResponseDrafts/draft", {...h.draft});
  if (withPhoto) {
    h.store.records.set("organizerFormAssets/asset", {
      organizerId: "org", formId: "form", versionId: "version",
      draftId: "draft", questionId: "photo", respondentUid: "person",
      status: "ready", deletedAt: null, sizeBytes: 1000,
      contentType: "image/jpeg",
      storagePath: "organizerForms/form/draft/asset"});
  }
  const {paymentId} = await h.reserve();
  h.capture(paymentId);
  await h.finalize(paymentId);
  if (withPhoto) {
    h.store.records.set("organizerFormAssets/asset", {
      ...h.store.records.get("organizerFormAssets/asset"),
      expiresAt: Timestamp.fromMillis(now.toMillis() + 60_000)});
  }
  const responseId = [...h.store.records.keys()].find((path) =>
    path.startsWith("participantFormProfileProposals/"))!.split("/")[1];
  const data: Payload = {responseId, expectedProfileRevision: 0,
    expectedIntakeRevision: 0, requestId: "claim-request-00000001",
    termsVersion: "form-profile-claim-v1", profile,
    selectedQuestionIds: ["name", "cocktail", ...(withPhoto ? ["photo"] : [])]};
  const request = (patch: Partial<Payload> = {}, uid = "person") =>
    ({auth: {uid, token: {phone_number: "+919000000001"}},
      data: {...data, ...patch}} as unknown as CallableRequest<unknown>);
  const deps = {db: () => h.db, now: () => now,
    rateLimit: async () => undefined, copyPhoto: async () => photo};
  return {...h, responseId, request, deps, data};
}

test("claim creates a non-dating identity and only selected private pointers",
  async () => {
    const h = await fixture();
    const result = await claim(h.request(), h.deps);
    assert.equal(result.profileRevision, 1);
    const user = h.store.records.get("users/person")!;
    assert.equal(user.phoneNumber, "+919000000001");
    assert.equal(user.profileComplete, false);
    assert.equal(user.prefsShowInCrossPaths, false);
    assert.deepEqual(user.interestedInGenders, []);
    const card = h.store.records.get(
      `participantOrganizerCards/${h.responseId}`)!;
    assert.deepEqual(card.questionIds, ["cocktail"]);
    assert.equal(JSON.stringify(card).includes("Tequila"), false);
    assert.equal(JSON.stringify(user).includes("Private"), false);
    assert.equal([...h.store.records.keys()].some((key) =>
      /^(publicProfiles|eventRooms|participantOrganizerDataGrants)\//u
        .test(key)), false);
    const resultReview = await review({...h.request(), data: {
      responseId: h.responseId}}, h.deps);
    assert.equal(resultReview.profileRevision, 1);
    assert.equal(resultReview.intakeRevision, 0);
    assert.deepEqual(resultReview.fields.map((field) => field.questionId),
      ["name", "cocktail"]);
    assert.equal(resultReview.fields.find((field) =>
      field.questionId === "cocktail")?.eventProfileEligible, false);
  });

test("explicit audience only marks the owner-reviewed answer as event-eligible",
  async () => {
    const h = await fixture(false, true);
    const result = await review({...h.request(), data: {
      responseId: h.responseId}}, h.deps);
    assert.deepEqual(result.fields.map((field) =>
      [field.questionId, field.eventProfileEligible]),
    [["name", false], ["cocktail", true]]);
    assert.equal(result.fields.some((field) => field.value === "Private"),
      false);
  });

test("concurrent identical claims commit once; reused keys cannot change data",
  async () => {
    const h = await fixture();
    const results = await Promise.all([claim(h.request(), h.deps),
      claim(h.request(), h.deps)]);
    assert.deepEqual(results.map((result) => result.replayed).sort(),
      [false, true]);
    assert.equal(h.store.records.get("users/person")!.profileRevision, 1);
    await assert.rejects(claim(h.request({profile: {...profile,
      displayName: "Different"}}), h.deps), /already used/u);
  });

test("normal profile edits invalidate an earlier claim review", async () => {
  const h = await fixture();
  await claim(h.request(), h.deps);
  await updateUserProfileHandler({...h.request(), data: {fields: {
    displayName: "Newer name"}}}, {firestore: () => h.db,
    timestampFromMillis: Timestamp.fromMillis});
  assert.equal(h.store.records.get("users/person")!.profileRevision, 2);
  await assert.rejects(claim(h.request({expectedProfileRevision: 1,
    requestId: "claim-request-00000002"}), h.deps), /profile changed/u);
  assert.equal(h.store.records.get("users/person")!.displayName, "Newer name");
});

test("existing preferences and unedited core fields survive claiming",
  async () => {
    const h = await fixture();
    const old = reviewedUserProfile({current: undefined, reviewed: profile,
      phone: "+919000000001", photo: null, now});
    h.store.records.set("users/person", {...old, occupation: "Founder",
      bio: "Legacy content",
      prefsShowOnMap: true, interestedInGenders: ["man"]});
    await claim(h.request({expectedProfileRevision: 1}), h.deps);
    const user = h.store.records.get("users/person")!;
    assert.equal(user.occupation, "Founder");
    assert.equal(user.bio, "Legacy content");
    assert.equal(user.prefsShowOnMap, true);
    assert.deepEqual(user.interestedInGenders, ["man"]);
  });

test("unverified, foreign and deleted identities cannot claim or review",
  async () => {
    const h = await fixture();
    for (const request of [h.request({}, "foreign"),
      {...h.request(), auth: undefined},
      {...h.request(), auth: {uid: "person", token: {}}}]) {
      await assert.rejects(claim(request as CallableRequest<unknown>, h.deps));
    }
    h.store.records.set("deletedUsers/person", {status: "processing"});
    await assert.rejects(claim(h.request(), h.deps), /unavailable/u);
    await assert.rejects(review({...h.request(), data: {
      responseId: h.responseId}}, h.deps), /unavailable/u);
    assert.equal(h.store.records.has("users/person"), false);
  });

test("CRM answers and server-owned profile controls cannot be claimed",
  async () => {
    const h = await fixture();
    await assert.rejects(claim(h.request({selectedQuestionIds: ["crm"]}),
      h.deps), /Only the reviewed/u);
    for (const field of ["phoneNumber", "profileComplete", "prefsShowOnMap"]) {
      await assert.rejects(claim(h.request({profile: {...profile,
        [field]: true}}), h.deps));
    }
    assert.equal(h.store.records.has("users/person"), false);
  });

function selectLinkedin(h: Awaited<ReturnType<typeof fixture>>) {
  h.version.definition.sections[0].questions[0].canonicalFieldId =
    "linkedinUrl";
  const path = `participantFormProfileProposals/${h.responseId}`;
  h.store.records.set(path, {...h.store.records.get(path), fields: [{
    questionId: "name", destination: "catchProfile",
    canonicalFieldId: "linkedinUrl"}]});
}

test("LinkedIn requires explicit review and goes only to private intake",
  async () => {
    const h = await fixture();
    selectLinkedin(h);
    await assert.rejects(claim(h.request({selectedQuestionIds: ["name"]}),
      h.deps), /Review the selected/u);
    const linkedin = "https://www.linkedin.com/in/sara-demo";
    await claim(h.request({selectedQuestionIds: ["name"],
      reviewedLinkedinUrl: linkedin}), h.deps);
    const intake = h.store.records.get("participantIntakeProfiles/person")!;
    assert.equal(intake.revision, 1);
    assert.equal(JSON.stringify(intake).includes(linkedin), true);
    assert.equal(JSON.stringify(h.store.records.get("users/person"))
      .includes(linkedin), false);
  });

test("stale review cannot overwrite newer private intake", async () => {
  const h = await fixture();
  selectLinkedin(h);
  h.store.records.set("participantIntakeProfiles/person", {revision: 2});
  await assert.rejects(claim(h.request({selectedQuestionIds: ["name"],
    reviewedLinkedinUrl: "https://linkedin.com/in/sara"}), h.deps),
  /application profile changed/u);
  assert.equal(h.store.records.has("users/person"), false);
});

test("withdrawal, deletion and profile edits during photo work abort claiming",
  async () => {
    for (const change of ["withdraw", "delete", "edit", "asset"]) {
      const h = await fixture(true);
      const copyPhoto = async () => {
        if (change === "withdraw") {
          const path = `organizerFormResponses/${h.responseId}`;
          h.store.records.set(path, {...h.store.records.get(path),
            status: "withdrawn", withdrawnAt: now});
        } else if (change === "delete") {
          h.store.records.set("deletedUsers/person", {status: "processing"});
        } else if (change === "asset") {
          h.store.records.set("organizerFormAssets/asset", {
            ...h.store.records.get("organizerFormAssets/asset"),
            deletedAt: now});
        } else h.store.records.set("users/person", {profileRevision: 1});
        return photo;
      };
      let cleaned = false;
      await assert.rejects(claim(h.request(), {...h.deps, copyPhoto,
        cleanupDeletedPhoto: async () => {
          cleaned = true;
          return change === "delete";
        }}));
      assert.equal(cleaned, true);
      assert.equal(h.store.records.has(
        `participantOrganizerCards/${h.responseId}`), false);
      assert.equal([...h.store.records.keys()].some((path) =>
        path.startsWith("participantProfileClaimReceipts/")), false);
    }
  });

test("invalid birth dates fail before copying a photo", async () => {
  const h = await fixture(true);
  let copies = 0;
  const deps = {...h.deps, copyPhoto: async () => {
    copies++; return photo;
  }};
  for (const dateOfBirth of ["2020-01-01", "1994-02-31", "1800-01-01"]) {
    await assert.rejects(claim(h.request({profile: {...profile,
      dateOfBirth}}), deps));
  }
  assert.equal(copies, 0);
});

test("copied owned photos are added once; replay does not copy again",
  async () => {
    const h = await fixture(true);
    let copies = 0;
    const deps = {...h.deps, copyPhoto: async () => {
      copies++; return photo;
    }};
    await claim(h.request(), deps);
    await claim(h.request(), deps);
    assert.equal(copies, 1);
    assert.deepEqual(h.store.records.get("users/person")!.profilePhotos,
      [photo]);
  });

test("deselecting card fields clears pointers without changing the source",
  async () => {
    const h = await fixture();
    await claim(h.request(), h.deps);
    const result = await claim(h.request({expectedProfileRevision: 1,
      selectedQuestionIds: [], requestId: "claim-request-00000002"}), h.deps);
    assert.equal(result.organizerCardId, null);
    assert.deepEqual(h.store.records.get(
      `participantOrganizerCards/${h.responseId}`)!.questionIds, []);
    assert.equal(h.store.records.has(
      `organizerFormResponses/${h.responseId}`), true);
  });


test("owned review includes editable values and selected card, never CRM",
  async () => {
    const h = await fixture();
    await claim(h.request(), h.deps);
    h.store.records.set("organizers/org", {name: "RSVP"});
    const result = await review({...h.request(), data: {
      responseId: h.responseId}}, h.deps);
    assert.equal(validateGetParticipantFormProfileCallableResponse(result),
      true);
    assert.equal(result.organizerName, "RSVP");
    assert.equal(result.claimedAtMillis, now.toMillis());
    assert.equal(result.currentProfile?.dateOfBirth, "1994-06-15");
    assert.equal(result.currentProfile?.displayName, "Sara Demo");
    assert.deepEqual(result.selectedCardQuestionIds, ["cocktail"]);
    assert.equal(result.cardRevision, 1);
    assert.equal(result.organizerId, "org");
    assert.equal(JSON.stringify(result).includes("Private"), false);
    assert.equal("phoneNumber" in result.currentProfile!, false);
    assert.equal("prefsShowOnMap" in result.currentProfile!, false);
  });

test("directory pagination skips withdrawn sources without exposing others",
  async () => {
    const h = await fixture();
    await claim(h.request(), h.deps);
    const proposal = h.store.records.get(
      `participantFormProfileProposals/${h.responseId}`)!;
    const response = h.store.records.get(
      `organizerFormResponses/${h.responseId}`)!;
    h.store.records.delete(`participantFormProfileProposals/${h.responseId}`);
    for (const id of ["a", "b", "c"]) {
      h.store.records.set(`participantFormProfileProposals/${id}`,
        {...proposal, responseId: id});
      h.store.records.set(`organizerFormResponses/${id}`,
        {...response, status: id === "a" ? "withdrawn" : "submitted",
          withdrawnAt: id === "a" ? now : null});
    }
    h.store.records.set("participantFormProfileProposals/foreign",
      {...proposal, uid: "someone-else", responseId: "foreign"});
    const request = (cursor: string | null) => ({...h.request(), data: {
      cursor, limit: 1}});
    const first = await list(request(null), h.deps);
    assert.deepEqual(first, {items: [], nextCursor: "a"});
    const second = await list(request(first.nextCursor), h.deps);
    assert.deepEqual(second.items.map((row) => row.responseId), ["b"]);
    const third = await list(request(second.nextCursor), h.deps);
    assert.deepEqual(third.items.map((row) => row.responseId), ["c"]);
    assert.equal(third.nextCursor, null);
    h.store.records.set("deletedUsers/person", {status: "processing"});
    await assert.rejects(list(request(null), h.deps), /unavailable/u);
  });
