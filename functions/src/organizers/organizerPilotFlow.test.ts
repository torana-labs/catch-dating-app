import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import {CallableRequest} from "firebase-functions/v2/https";
import {createOrganizerFormHandler, updateOrganizerFormDraftHandler,
  publishOrganizerFormHandler} from "./organizerForms";
import {beginOrganizerFormResponseHandler,
  saveOrganizerFormResponseDraftHandler,
  submitOrganizerFormResponseHandler} from "./organizerFormResponses";
import {projectApplicationPurposeResponse} from "./organizerFormAutomations";
import {getOrganizerApplicationDetailHandler, reviewOrganizerApplicationHandler}
  from "./organizerApplications";
import {genericFormApplicationId} from "./organizerApplicationAccess";
import {convertOrganizerFormResponseHandler,
  previewOrganizerFormConversionHandler}
  from "./organizerFormConversions";
import {projectEventAttendeeToOrganizerAudience}
  from "./organizerAudienceProjection";
import {addExistingOrganizerContactTag} from "./organizerContacts";
import {prepareOrganizerManualSendTaskHandler}
  from "./organizerManualSendTasks";
import {upsertOrganizerSavedAudienceHandler,
  previewOrganizerSavedAudienceHandler}
  from "./organizerSavedAudiences";
import {upsertOrganizerCampaignHandler, evaluateAudienceRows}
  from "./organizerCampaigns";
import type {OrganizerContactDocument, OrganizerContactTraitDocument,
  OrganizerFormResponseDocument, EventAttendeeDocument,
  OrganizerFormVersionDocument} from
  "../shared/generated/firestoreAdminTypes";
import {eventAttendeeId} from "../events/eventAttendees";
import {formAdmissionContactId, formConversionReceiptId} from
  "./organizerFormAdmissionIdentity";
import {listOrganizerFormResponsesHandler} from "./organizerFormOperations";
import {AudienceTestStore} from "./organizerAudienceTestStore";
import type {UpdateOrganizerFormDraftCallablePayload} from
  "../shared/generated/updateOrganizerFormDraftCallablePayload";

type Definition = UpdateOrganizerFormDraftCallablePayload["definition"];
type Question = Definition["sections"][number]["questions"][number];
const now = Timestamp.fromMillis(1800000000000);
const host = (data: object) => ({auth: {uid: "host-1", token: {}}, data}) as
  CallableRequest<unknown>;
const guest = (data: object) => ({auth: {uid: "guest-1", token: {
  email: "pilot@example.com", email_verified: true,
}}, data}) as CallableRequest<unknown>;

function question(id: string, kind: Question["kind"],
  canonicalFieldId: Question["canonicalFieldId"] = null): Question {
  return {questionId: id, key: id, label: id, helpText: null, kind,
    canonicalFieldId, required: true, privacyClass: "organizerCustom",
    hostPresentation: "detailOnly", prefillPolicy: "never",
    options: kind === "singleChoice" || kind === "multiChoice" ?
      [{optionId: "one", value: "one", label: "First option"},
        {optionId: "two", value: "two", label: "Second option"}] : [],
    validation: {minLength: null, maxLength: null, minNumber: null,
      maxNumber: null, earliestDate: null, latestDate: null,
      minSelections: null, maxSelections: null, maxFileCount: null,
      maxFileSizeBytes: null, allowedMimeTypes: [], patternPreset: null,
      customError: null}};
}

// Synthetic field coverage for both pilot forms; no real respondents.
function pilotQuestions(rsvp: boolean): Question[] {
  const shared = [question("name", "shortText", "displayName"),
    question("phone", "phone", "phoneNumber"),
    question("email", "email", "email"), question("age", "number", "age"),
    question("gender", "singleChoice", "gender"),
    question("city", "shortText", "city"),
    question("instagram", "url", "instagramHandle"),
    question("linkedin", "url", "linkedinUrl"),
    question("height", "number"), question("relationship", "singleChoice"),
    question("children", "boolean"), question("education", "shortText"),
    question("occupation", "shortText", "occupation"),
    question("goals", "multiChoice"), question("source", "shortText"),
    question("eligibility", "acknowledgement")];
  const extra: Array<[string, Question["kind"]]> = rsvp ? [
    ["dob", "date"], ["drink", "singleChoice"], ["diet", "singleChoice"],
    ["company", "shortText"], ["values", "singleChoice"],
    ["futureChildren", "singleChoice"], ["personality", "multiChoice"],
    ["hobbies", "multiChoice"], ["ethnicity", "shortText"],
    ["partnerEthnicity", "shortText"], ["partnerAge", "singleChoice"],
    ["photo", "file"],
  ] : [["workStatus", "singleChoice"], ["incomeMen", "multiChoice"],
    ["incomeWomen", "multiChoice"], ["about", "longText"],
    ["documentAcknowledgement", "acknowledgement"],
    ["accuracy", "acknowledgement"], ["profileSharing", "acknowledgement"],
    ["dataUse", "acknowledgement"]];
  return [...shared, ...extra.map(([id, kind]) => question(id, kind))];
}

async function submittedPilot(rsvp: boolean) {
  const store = new AudienceTestStore({"organizers/org-1": {
    ownerUserId: "host-1", hostUserIds: ["host-1"], hostProfiles: [],
    name: "Pilot organizer", imageUrl: null,
  }, "events/event-1": {organizerId: "org-1", status: "published", eventFormat: {activityKind: "singlesMixer"}}});
  const deps = {firestore: () => store.asFirestore(), timestamp: () => now,
    checkRateLimit: async () => undefined, identitySecret: () =>
      "fixture-secret-".repeat(4),
    publicFormId: () => "pilot_public_form_1234567890123456",
    storageBucket: () => {
      throw new Error("No external storage in fixture");
    }};
  const created = await createOrganizerFormHandler(host({organizerId: "org-1",
    templateId: "blank", requestId: "pilot-create", title: "Pilot application",
    defaultTargetKind: "organizer", defaultTargetId: null}), deps);
  const formId = created.form.formId;
  const definition = {...created.definition, purpose: "application" as const,
    identityPolicy: "emailVerified" as const,
    sections: [{sectionId: "intake", title: "Application", description: null,
      pageBreak: false, questions: pilotQuestions(rsvp)}]};
  const updated = await updateOrganizerFormDraftHandler(host({
    organizerId: "org-1",
    formId, expectedRevision: 1, definition}), deps);
  await publishOrganizerFormHandler(host({organizerId: "org-1", formId,
    expectedRevision: updated.form.draftRevision}), deps);
  const started = await beginOrganizerFormResponseHandler(guest({
    publicFormId: deps.publicFormId(), requestId: "pilot-begin-request-1",
    sourceToken: null,
  }), deps);
  const answers: Record<string, string | string[] | number | boolean> = {};
  for (const q of definition.sections[0].questions) {
    answers[q.questionId] = q.kind === "number" ? 40 :
      q.kind === "boolean" || q.kind === "acknowledgement" ? true :
        q.kind === "singleChoice" ? "one" : q.kind === "multiChoice" ? ["one"] :
          q.kind === "file" ? ["formasset_pilot"] : q.kind === "date" ?
            "1986-09-01" : "Synthetic answer";
  }
  Object.assign(answers, {name: "Pilot Guest", phone: "+919876543210",
    email: "pilot@example.com", instagram: "https://www.instagram.com/pilot/",
    linkedin: "https://www.linkedin.com/in/pilot/"});
  if (rsvp) {
    store.docs["organizerFormAssets/formasset_pilot"] = {
      organizerId: "org-1", formId, versionId: started.form.versionId,
      draftId: started.draftId, questionId: "photo", respondentUid: "guest-1",
      status: "ready", deletedAt: null,
    };
  }
  const saved = await saveOrganizerFormResponseDraftHandler(guest({
    draftId: started.draftId, draftToken: null,
    expectedRevision: started.revision,
    answers, consentAccepted: true,
  }), deps);
  const submit = () => submitOrganizerFormResponseHandler(guest({
    draftId: started.draftId, draftToken: null,
    expectedRevision: saved.revision,
    requestId: "pilot-submit-request-1",
  }), deps);
  const receipt = await submit();
  assert.deepEqual(await submit(), receipt);
  const response = store.docs[`organizerFormResponses/${receipt.responseId}`] as
    unknown as OrganizerFormResponseDocument;
  await projectApplicationPurposeResponse(receipt.responseId, undefined,
    response, deps);
  return {store, deps, response, responseId: receipt.responseId};
}

for (const rsvp of [true, false]) {
  test(`${rsvp ? "RSVP" : "Beyond Small Talk"} fields publish, ` +
    "submit, review, and admit the same CRM person", async () => {
    const h = await submittedPilot(rsvp);
    const applicationId = genericFormApplicationId(h.responseId);
    const detail = await getOrganizerApplicationDetailHandler(host({
      organizerId: "org-1", applicationId,
    }), h.deps);
    assert.equal(detail.answers.length, pilotQuestions(rsvp).length);
    assert.equal(detail.outreach.phoneE164, "+919876543210");
    assert.equal(detail.outreach.instagramUrl, "https://www.instagram.com/pilot/");
    assert.equal(detail.outreach.linkedinUrl, "https://www.linkedin.com/in/pilot/");
    const accepted = await reviewOrganizerApplicationHandler(host({
      organizerId: "org-1", applicationId, expectedRevision: detail.revision,
      reviewStatus: "approved", reviewNote: "Discovery call completed",
    }), h.deps);
    h.store.docs["organizerContactTagVocabularies/org-1"] = {
      organizerId: "org-1", tags: [{tagId: "a".repeat(32), label: "Pilot"}],
    };
    await addExistingOrganizerContactTag({db: h.store.asFirestore(),
      organizerId: "org-1", contactId: accepted.contactId!,
      tagId: "a".repeat(32),
      actorUid: "host-1", now});
    const conversion = {organizerId: "org-1", responseId: h.responseId,
      kind: "eventAttendeeProposal", eventId: "event-1", overrides: {}};
    const preview = await previewOrganizerFormConversionHandler(
      host(conversion), h.deps);
    assert.equal(preview.allowed, true);
    const admitted = await convertOrganizerFormResponseHandler(host({
      ...conversion,
      requestId: "pilot-admit"}), h.deps);
    const attendee = h.store.docs[`eventAttendees/${admitted.resultId}`] as
      unknown as EventAttendeeDocument;
    assert.equal(attendee.status, "registered");
    assert.equal(attendee.linkedUid, null);
    await projectEventAttendeeToOrganizerAudience(admitted.resultId!, undefined,
      attendee, "pilot-projection", h.deps);
    const contacts = Object.entries(h.store.docs).filter(([path]) =>
      path.startsWith("organizerContacts/"));
    assert.equal(contacts.length, 1,
      "roster must retain the accepted CRM person");
    assert.equal(contacts[0][0], `organizerContacts/${accepted.contactId}`);
    assert.equal(contacts[0][1].whatsappStatus, "unknown");
    assert.deepEqual(contacts[0][1].manualTagIds, ["a".repeat(32)]);
    const paymentCopy = "Your place is approved. Pay the organizer: " +
      "https://example.com/pay/pilot?guest=fixture&event=mixer";
    const handoff = await prepareOrganizerManualSendTaskHandler(host({
      organizerId: "org-1", contactId: accepted.contactId,
      requestId: "pilot-payment-link", intent: "individualConversation",
      prefillText: paymentCopy,
    }), {...h.deps, now: () => now});
    assert.equal(handoff.prefillText, paymentCopy);
    assert.equal(handoff.status, "queued");
    const audience = await upsertOrganizerSavedAudienceHandler(host({
      organizerId: "org-1", requestId: "pilot-audience", scope: "organizerCrm",
      name: "Pilot guests", definition: {join: "all",
        predicates: [{kind: "manualTag", manualTagId: "a".repeat(32)}]},
    }), {...h.deps, now: () => now});
    const audiencePreview = await previewOrganizerSavedAudienceHandler(host({
      organizerId: "org-1", audienceId: audience.audienceId,
    }), {...h.deps, now: () => now});
    assert.equal(audiencePreview.matchCount, 1);
    assert.equal(audiencePreview.coverage, "exact");
    const campaign = await upsertOrganizerCampaignHandler(host({
      organizerId: "org-1", requestId: "pilot-campaign", name: "Pilot payment",
      messageClass: "eventFollowUp", savedAudienceId: audience.audienceId,
      connectionId: "fixture-sender", templateId: "fixture-template",
      templateVariables: {payment_link: "https://example.com/pay/pilot"},
      eventId: "event-1",
    }), {...h.deps, now: () => now});
    assert.equal(campaign.savedAudienceId, audience.audienceId);
    assert.deepEqual(
      h.store.docs[`organizerCampaigns/${campaign.campaignId}`]
        .templateVariables,
      {payment_link: "https://example.com/pay/pilot"});
    const eligibility = evaluateAudienceRows([{
      contactId: accepted.contactId!,
      contact: contacts[0][1] as unknown as OrganizerContactDocument,
      trait: h.store.docs[`organizerContactTraits/${accepted.contactId}`] as
        unknown as OrganizerContactTraitDocument,
      preference: null, channelState: null,
    }], now, []);
    assert.equal(eligibility[0].eligibility, "excluded");
    assert.equal(await formAdmissionContactId({db: h.store.asFirestore(),
      attendeeId: admitted.resultId!, attendee: {...attendee,
        externalReference: "unrelated-response"}}), null);
    assert.equal(audiencePreview.reachSummary.byHand, 1);
    assert.equal(audiencePreview.reachSummary.automatic, 0);
    assert.deepEqual(audiencePreview.sample.map((p) => p.contactId),
      [accepted.contactId]);
    // A second event is a distinct admission, not a replay of the first.
    h.store.docs["events/event-2"] = {...h.store.docs["events/event-1"]};
    const secondInput = {...conversion, eventId: "event-2",
      requestId: "pilot-second"};
    const second = await convertOrganizerFormResponseHandler(
      host(secondInput), h.deps);
    assert.notEqual(second.resultId, admitted.resultId);
    assert.deepEqual(await convertOrganizerFormResponseHandler(
      host(secondInput), h.deps), second);
    await projectEventAttendeeToOrganizerAudience(second.resultId!, undefined,
      h.store.docs[`eventAttendees/${second.resultId}`] as unknown as
        EventAttendeeDocument, "pilot-second-projection", h.deps);
    assert.equal(Object.keys(h.store.docs).filter((p) =>
      p.startsWith("organizerContacts/")).length, 1);
    assert.equal(Object.keys(h.store.docs).some((p) =>
      p.startsWith("payments/")), false);
  });
}


test("CRM conversion refuses conflicting phone and email matches", async () => {
  const h = await submittedPilot(false);
  const base = {organizerId: "org-1", deletedAt: null, hiddenAt: null,
    mergedIntoContactId: null, linkedUid: null};
  h.store.docs["organizerContacts/phone-person"] = {...base,
    phoneE164: "+919876543210", email: null};
  h.store.docs["organizerContacts/email-person"] = {...base,
    phoneE164: null, email: "pilot@example.com"};
  const conversion = {organizerId: "org-1", responseId: h.responseId,
    kind: "crmContact", eventId: null, overrides: {}};
  await assert.rejects(previewOrganizerFormConversionHandler(host(conversion),
    h.deps), {code: "failed-precondition"});
  await assert.rejects(convertOrganizerFormResponseHandler(host({
    ...conversion,
    requestId: "conflict-conversion"}), h.deps), {code: "failed-precondition"});
  assert.equal(Object.keys(h.store.docs).filter((p) =>
    p.startsWith("organizerContacts/")).length, 2);
});


test("admission preview refuses an existing roster edge for another contact",
  async () => {
    const h = await submittedPilot(false);
    const attendeeId = eventAttendeeId("event-1",
      `external:${h.responseId.toLowerCase()}`);
    h.store.docs[`organizerContactEventEdges/${attendeeId}`] = {
      contactId: "other-contact",
    };
    const conversion = {organizerId: "org-1", responseId: h.responseId,
      kind: "eventAttendeeProposal", eventId: "event-1", overrides: {}};
    const preview = await previewOrganizerFormConversionHandler(
      host(conversion), h.deps);
    assert.equal(preview.allowed, false);
    assert.match(preview.warnings.join(" "), /another CRM contact/);
    await assert.rejects(convertOrganizerFormResponseHandler(host({
      ...conversion, requestId: "existing-roster-conflict",
    }), h.deps), {code: "failed-precondition"});
    assert.equal(Object.keys(h.store.docs).some((p) =>
      p.startsWith("organizerContacts/")), false);
  });


test("admission preview retains a completed legacy receipt destination",
  async () => {
    const h = await submittedPilot(false);
    const attendeeId = eventAttendeeId("event-1", "phone:+919876543210");
    h.store.docs[`organizerContactEventEdges/${attendeeId}`] = {
      contactId: "other-contact",
    };
    const receiptId = formConversionReceiptId(h.responseId,
      "eventAttendeeProposal", "event-1");
    h.store.docs[`organizerFormConversionReceipts/${receiptId}`] = {
      organizerId: "org-1", formId: h.response.formId,
      responseId: h.responseId, kind: "eventAttendeeProposal",
      requestId: "legacy-admission", actorUid: "host-1",
      status: "completed", resultId: attendeeId,
      fields: [{destinationField: "eventId", label: "Event",
        value: "event-1", origin: "hostOverride", conflict: null}],
      undoStatus: "notAvailable", createdAt: now, updatedAt: now,
      completedAt: now,
    };
    const conversion = {organizerId: "org-1", responseId: h.responseId,
      kind: "eventAttendeeProposal", eventId: "event-1", overrides: {}};
    const preview = await previewOrganizerFormConversionHandler(
      host(conversion), h.deps);
    assert.equal(preview.existingResultId, attendeeId);
    assert.equal(preview.allowed, false);
    assert.match(preview.warnings.join(" "), /another CRM contact/);
  });


test("answer-filtered inbox scans across pages and binds cursors", async () => {
  const h = await submittedPilot(false);
  const version = h.store.docs[
    `organizerFormVersions/${h.response.versionId}`
  ] as unknown as OrganizerFormVersionDocument;
  const city = version.definition.sections[0].questions.find(
    (q) => q.questionId === "city")!;
  city.kind = "singleChoice";
  city.hostPresentation = "filterable";
  city.options = ["Mumbai", "Dubai"].map((value) =>
    ({optionId: value, value, label: value}));
  delete h.store.docs[`organizerFormResponses/${h.responseId}`];
  for (let index = 0; index < 520; index++) {
    const id = `response-${String(index).padStart(3, "0")}`;
    h.store.docs[`organizerFormResponses/${id}`] = {
      ...h.response,
      submittedAt: Timestamp.fromMillis(now.toMillis() + index),
      answerSnapshots: h.response.answerSnapshots.map((answer) =>
        answer.questionId === "city" ?
          {...answer, answer: index < 500 ? "Dubai" : "Mumbai"} : answer),
    };
  }
  const payload = {organizerId: "org-1", formId: h.response.formId,
    versionId: null, statuses: [], identityKinds: [], sourceLinkId: null,
    query: null, fromMillis: null, toMillis: null, cursor: null,
    limit: 2, sortDirection: "asc",
    answerFilters: [{questionId: "city", values: ["Mumbai"]}]};
  const first = await listOrganizerFormResponsesHandler(host(payload), h.deps);
  assert.equal(first.items.length, 0);
  assert.ok(first.nextCursor, "scan exhaustion must allow continuation");
  const second = await listOrganizerFormResponsesHandler(host(
    {...payload, cursor: first.nextCursor}), h.deps);
  assert.deepEqual(second.items.map((row) => row.responseId),
    ["response-500", "response-501"]);
  const third = await listOrganizerFormResponsesHandler(host(
    {...payload, cursor: second.nextCursor}), h.deps);
  assert.deepEqual(third.items.map((row) => row.responseId),
    ["response-502", "response-503"]);
  const newest = await listOrganizerFormResponsesHandler(host(
    {...payload, sortDirection: "desc"}), h.deps);
  assert.deepEqual(newest.items.map((row) => row.responseId),
    ["response-519", "response-518"]);
  await assert.rejects(listOrganizerFormResponsesHandler(host({...payload,
    sortDirection: "desc", cursor: second.nextCursor}), h.deps),
  {code: "invalid-argument"});
  await assert.rejects(listOrganizerFormResponsesHandler(host({...payload,
    cursor: second.nextCursor,
    answerFilters: [{questionId: "city", values: ["Dubai"]}]}), h.deps),
  {code: "invalid-argument"});
});
