import crypto from "node:crypto";
import fs from "node:fs";
import {createFunctionsRequire} from "../../lib/repo_paths.mjs";
import {eventSchemaFill} from "./event_schema_fill.mjs";

// Event policy derivation is shared with Functions so the migration stores
// exactly what an event gets when it first receives terms. Build Functions
// (npm --prefix functions run build) before running the event-policy migration.
let eventPolicyModule = null;
let rosterModules = null;
function functionsRoster() {
  try {
    const load = createFunctionsRequire();
    rosterModules ??= {
      projection: load("./lib/events/eventAttendeeProjection.js"),
      attendees: load("./lib/events/eventAttendees.js"),
      admin: load("firebase-admin"),
    };
  } catch (error) {
    throw new Error(
      "The catch-booking-roster migration needs compiled Functions; " +
      `run \`npm --prefix functions run build\` first (${error.message}).`,
    );
  }
  return rosterModules;
}

/** The one roster row linked to this account on this event, if any. */
async function linkedAttendeeId(db, eventId, uid) {
  const rows = await db.collection("eventAttendees")
    .where("eventId", "==", eventId).where("linkedUid", "==", uid).limit(2).get();
  if (rows.docs.length > 1) return {ambiguous: true};
  return {id: rows.docs[0]?.id ?? null};
}

function uidAttendeeId(eventId, uid) {
  return functionsRoster().attendees.eventAttendeeId(eventId, `uid:${uid}`);
}
function functionsEventPolicy() {
  try {
    eventPolicyModule ??= createFunctionsRequire()("./lib/events/eventPolicy.js");
  } catch (error) {
    throw new Error(
      "The event-policy migration needs the compiled Functions policy; " +
      `run \`npm --prefix functions run build\` first (${error.message}).`,
    );
  }
  return eventPolicyModule;
}

let marketModule = null;
/** {id, timeZone} for a market id or alias, from the Functions market config. */
function functionsMarket(value) {
  try {
    marketModule ??= createFunctionsRequire()("./lib/locations/marketConfig.js");
  } catch (error) {
    throw new Error(
      "The event-schema-fill migration needs the compiled market config; " +
      `run \`npm --prefix functions run build\` first (${error.message}).`,
    );
  }
  const market = marketModule.marketForIdOrAlias(value);
  return market ? {id: market.marketId, cityId: market.cityId,
    timeZone: market.timeZone} : null;
}

let chatDirectoryModule = null;
function functionsChatDirectory() {
  try {
    chatDirectoryModule ??= createFunctionsRequire()("./lib/chats/eventChatDirectory.js");
  } catch (error) {
    throw new Error(
      "The event-chat-directory migration needs compiled Functions; " +
      `run \`npm --prefix functions run build\` first (${error.message}).`,
    );
  }
  return chatDirectoryModule;
}

let organizerSummaryModule = null;
function functionsOrganizerSummary() {
  try {
    organizerSummaryModule ??= createFunctionsRequire()("./lib/organizers/eventOrganizerSummary.js");
  } catch (error) {
    throw new Error(
      "The event-organizer-summary migration needs compiled Functions; " +
      `run \`npm --prefix functions run build\` first (${error.message}).`,
    );
  }
  return organizerSummaryModule;
}

let membershipSavingsModule = null;
function functionsMembershipSavings() {
  try {
    membershipSavingsModule ??= createFunctionsRequire()("./lib/hostMemberships/savingsSummary.js");
  } catch (error) {
    throw new Error(
      "The host-membership-savings migration needs compiled Functions; " +
      `run \`npm --prefix functions run build\` first (${error.message}).`,
    );
  }
  return membershipSavingsModule;
}

/** Every benefit use naming one membership, read a page at a time. */
async function membershipBenefitUses(db, membershipId) {
  const uses = [];
  let last = null;
  for (;;) {
    let query = db.collection("hostMembershipBenefitUses")
      .where("membershipId", "==", membershipId).orderBy("__name__").limit(500);
    if (last) query = query.startAfter(last);
    const snap = await query.get();
    for (const doc of snap.docs) uses.push(doc.data());
    if (snap.docs.length < 500) return uses;
    last = snap.docs[snap.docs.length - 1];
  }
}

/** One clock per run, so a row reached from two sources is identical. */
const chatDirectoryNowMillis = Date.now();

/** The person's directory row from current authority, or null. */
async function chatDirectoryRow(db, eventId, uid) {
  if (typeof eventId !== "string" || !eventId || typeof uid !== "string" || !uid) return null;
  const {eventChatDirectoryEntry} = functionsChatDirectory();
  return db.runTransaction((tx) =>
    eventChatDirectoryEntry(db, tx, eventId, uid, chatDirectoryNowMillis));
}

let guestEventModules = null;
function functionsGuestEvents() {
  try {
    const load = createFunctionsRequire();
    guestEventModules ??= {
      entry: load("./lib/guestEvents/eventGuestEntry.js"),
      status: load("./lib/guestEvents/guestEventStatus.js"),
      card: load("./lib/guestEvents/guestEventCard.js"),
    };
  } catch (error) {
    throw new Error(
      "The guest-event-read-models migration needs compiled Functions; " +
      `run \`npm --prefix functions run build\` first (${error.message}).`,
    );
  }
  return guestEventModules;
}

/** One clock per run, so a row reached from two sources is identical. */
const guestEventNowMillis = Date.now();

const validId = (value) => typeof value === "string" && value.length > 0 && !value.includes("/");

/**
 * The guest's records for one event, in the order the migration reads them:
 * their booking, then roster rows, website and offer payments, applications
 * and offer invitations. Only the first creates the row.
 */
async function guestEventSourcePaths(db, eventId, uid) {
  const byId = (snap) => snap.docs.map((doc) => doc.ref.path).sort();
  const [booking, roster, payments, applications, invitations] = await Promise.all([
    db.collection("eventBookings").doc(`${eventId}_${uid}`).get(),
    db.collection("eventAttendees").where("eventId", "==", eventId).where("linkedUid", "==", uid).get(),
    db.collection("guestPayments").where("eventId", "==", eventId).where("recipientUid", "==", uid).get(),
    db.collection("organizerApplications").where("targetId", "==", eventId).where("linkedUid", "==", uid).get(),
    db.collection("organizerEventOfferRecipients").where("eventId", "==", eventId).where("recipientUid", "==", uid).get(),
  ]);
  return [
    ...(booking.exists ? [`eventBookings/${eventId}_${uid}`] : []),
    ...byId(roster),
    ...byId({docs: payments.docs.filter((doc) => ["publicEvent", "offer"].includes(doc.data().purpose))}),
    ...byId({docs: applications.docs.filter((doc) => doc.data().targetKind === "event")}),
    ...byId(invitations),
  ];
}

function guestEventStatusStep(source, eventField, personField, accept = () => true) {
  return {
    source,
    target: "guestEventStatuses",
    skipReason: "no event or guest, or another of the guest's records creates the row",
    targetId: async (id, data, db) => {
      const eventId = data[eventField];
      const uid = data[personField];
      if (!validId(eventId) || !validId(uid) || !accept(data)) return null;
      const [first] = await guestEventSourcePaths(db, eventId, uid);
      return first === `${source}/${id}` ? `${eventId}_${uid}` : null;
    },
    transform: (data, id, db) => {
      const {guestEventStatus} = functionsGuestEvents().status;
      return db.runTransaction((tx) => guestEventStatus({db, tx,
        eventId: data[eventField], uid: data[personField], nowMillis: guestEventNowMillis}));
    },
  };
}

/**
 * guestEventStatusStep for rows that do not exist yet: an existing row is
 * skipped (the fill step adds its new fields) instead of compared, so a run
 * after the triggers wrote rows never reports conflicts.
 */
function missingGuestEventStatusStep(source, eventField, personField) {
  const step = guestEventStatusStep(source, eventField, personField);
  return {
    ...step,
    skipReason: `${step.skipReason}, or the row exists`,
    targetId: async (id, data, db) => {
      const target = await step.targetId(id, data, db);
      if (target === null) return null;
      const row = await db.collection("guestEventStatuses").doc(target).get();
      return row.exists ? null : target;
    },
  };
}

let formVersionFilterModule = null;
function functionsFormVersionFilters() {
  try {
    formVersionFilterModule ??= createFunctionsRequire()(
      "./lib/hostReadModels/formVersionFilterStore.js");
  } catch (error) {
    throw new Error(
      "The host-form-version-filters migration needs compiled Functions; " +
      `run \`npm --prefix functions run build\` first (${error.message}).`,
    );
  }
  return formVersionFilterModule;
}

let requestViewModule = null;
function functionsRequestViews() {
  try {
    requestViewModule ??= createFunctionsRequire()(
      "./lib/hostReadModels/requestViewStore.js");
  } catch (error) {
    throw new Error(
      "The host-event-request-views migration needs compiled Functions; " +
      `run \`npm --prefix functions run build\` first (${error.message}).`,
    );
  }
  return requestViewModule;
}

/** One event's request view from current sources, read only. */
function requestViewRow(db, eventId) {
  const {hostEventRequestView} = functionsRequestViews();
  return db.runTransaction((tx) => hostEventRequestView(db, tx, eventId, Date.now()));
}

let hostDetailViewModules = null;
function functionsHostDetailViews() {
  try {
    const load = createFunctionsRequire();
    hostDetailViewModules ??= {
      contacts: load("./lib/hostReadModels/contactDetailViewStore.js"),
      applications: load("./lib/hostReadModels/applicationDetailViewStore.js"),
    };
  } catch (error) {
    throw new Error(
      "The host-contact-detail-views and host-application-detail-views " +
      "migrations need compiled Functions; run `npm --prefix functions run " +
      `build\` first (${error.message}).`,
    );
  }
  return hostDetailViewModules;
}

/** One contact's detail view from current sources, read only. */
async function contactDetailViewRow(db, contactId) {
  const {readHostContactDetailView} = functionsHostDetailViews().contacts;
  try {
    return await db.runTransaction((tx) =>
      readHostContactDetailView(db, tx, contactId));
  } catch {
    // A contact whose sources fail their contract gets no view, as in the
    // trigger.
    return null;
  }
}

/** One application's manager view from current sources, read only. */
async function applicationDetailViewRow(db, applicationId) {
  const {readHostApplicationDetailView} = functionsHostDetailViews().applications;
  try {
    return await db.runTransaction((tx) =>
      readHostApplicationDetailView(db, tx, applicationId));
  } catch {
    return null;
  }
}

let guestMessagingPermissionModule = null;
function functionsGuestMessagingPermissions() {
  try {
    guestMessagingPermissionModule ??= createFunctionsRequire()(
      "./lib/messaging/guestMessagingPermissionStore.js");
  } catch (error) {
    throw new Error(
      "The guest-messaging-permissions migration needs compiled Functions; " +
      `run \`npm --prefix functions run build\` first (${error.message}).`,
    );
  }
  return guestMessagingPermissionModule;
}

/** A guest messaging permission row from current sources, read only. */
function guestMessagingPermissionRow(db, row) {
  const {guestMessagingPermission} = functionsGuestMessagingPermissions();
  return db.runTransaction((tx) => guestMessagingPermission(db, tx, row));
}

let formProfileViewModule = null;
function functionsFormProfileViews() {
  try {
    formProfileViewModule ??= createFunctionsRequire()(
      "./lib/profiles/participantFormProfileViewStore.js");
  } catch (error) {
    throw new Error(
      "The participant-form-profile-views migration needs compiled Functions; " +
      `run \`npm --prefix functions run build\` first (${error.message}).`,
    );
  }
  return formProfileViewModule;
}

/** A guest's form profile review row from current sources, read only. */
function formProfileViewRow(db, responseId) {
  const {participantFormProfileView} = functionsFormProfileViews();
  return db.runTransaction((tx) => participantFormProfileView(db, tx, responseId));
}

/** A guest's intake revision view from current sources, read only. */
function intakeProfileViewRow(db, uid) {
  const {participantIntakeProfileView} = functionsFormProfileViews();
  return db.runTransaction((tx) => participantIntakeProfileView(db, tx, uid));
}

let whatsappThreadViewModule = null;
let sendSummaryModule = null;
function functionsHostInboxViews() {
  try {
    const load = createFunctionsRequire();
    whatsappThreadViewModule ??= load(
      "./lib/hostReadModels/whatsappThreadViewStore.js");
    sendSummaryModule ??= load("./lib/hostReadModels/sendSummaryStore.js");
  } catch (error) {
    throw new Error(
      "The host-whatsapp-thread-views and host-send-summaries migrations " +
      "need compiled Functions; run `npm --prefix functions run build` " +
      `first (${error.message}).`,
    );
  }
  return {threads: whatsappThreadViewModule, sends: sendSummaryModule};
}

const hostInboxNowMillis = Date.now();

/** A WhatsApp thread's manager view from current sources, read only. */
async function whatsappThreadViewRow(db, threadId) {
  const {readHostWhatsappThreadView} = functionsHostInboxViews().threads;
  try {
    return await db.runTransaction((tx) =>
      readHostWhatsappThreadView(db, tx, threadId, hostInboxNowMillis));
  } catch {
    // A thread that fails its contract gets no view, as in the trigger.
    return null;
  }
}

/** A Send's manager row from current sources, read only. */
async function sendSummaryRow(db, source) {
  const {readHostSendSummary} = functionsHostInboxViews().sends;
  try {
    return await db.runTransaction((tx) => readHostSendSummary(db, tx, source));
  } catch {
    return null;
  }
}

let formAutomationViewModule = null;
let formPaymentViewModule = null;
function functionsFormOperationViews() {
  try {
    const load = createFunctionsRequire();
    formAutomationViewModule ??= load(
      "./lib/hostReadModels/formAutomationViewStore.js");
    formPaymentViewModule ??= load("./lib/hostReadModels/formPaymentViewStore.js");
  } catch (error) {
    throw new Error(
      "The host-form-automation-views and host-form-payment-views migrations " +
      "need compiled Functions; run `npm --prefix functions run build` " +
      `first (${error.message}).`,
    );
  }
  return {automations: formAutomationViewModule, payments: formPaymentViewModule};
}

/** One form operation view from current sources, read only. */
async function formOperationViewRow(db, read, id) {
  try {
    return await db.runTransaction((tx) => read(db, tx, id));
  } catch {
    // A source that fails its contract gets no view, as in the trigger.
    return null;
  }
}

/** The organizer that owns an organizers/{organizerId}/posts document. */
function organizerPostOwner(ref) {
  const organizer = ref?.parent?.parent;
  return organizer?.parent?.id === "organizers" && validId(organizer.id) ?
    organizer.id : null;
}

let organizerBillViewModule = null;
let organizerJourneyViewModule = null;
function functionsOrganizerScreenViews() {
  try {
    const load = createFunctionsRequire();
    organizerBillViewModule ??= load(
      "./lib/hostReadModels/organizerBillViewStore.js");
    organizerJourneyViewModule ??= load(
      "./lib/hostReadModels/organizerJourneyViewStore.js");
  } catch (error) {
    throw new Error(
      "The host-organizer-bill-views and host-organizer-journey-views " +
      "migrations need compiled Functions; run `npm --prefix functions run " +
      `build\` first (${error.message}).`,
    );
  }
  return {bills: organizerBillViewModule, journeys: organizerJourneyViewModule};
}

/** Every journey view one organizer should have, read only. */
async function organizerJourneyViewRows(db, organizerId) {
  const {readOrganizerJourneyViews} = functionsOrganizerScreenViews().journeys;
  try {
    const views = await db.runTransaction((tx) =>
      readOrganizerJourneyViews(db, tx, organizerId));
    return [...views].map(([targetId, data]) => ({targetId, data}));
  } catch {
    // Sources that fail their contract get no views, as in the trigger.
    return [];
  }
}

let programAccessViewModule = null;
function functionsProgramAccessView() {
  try {
    programAccessViewModule ??= createFunctionsRequire()(
      "./lib/programs/programAccessView.js");
  } catch (error) {
    throw new Error(
      "The program-access-views migration needs compiled Functions; run " +
      `\`npm --prefix functions run build\` first (${error.message}).`,
    );
  }
  return programAccessViewModule;
}

const programAccessNowMillis = Date.now();

/** An account's programme authority view from current sources, read only. */
async function programAccessViewRow(db, programId, uid) {
  const {readProgramAccessView} = functionsProgramAccessView();
  try {
    return await db.runTransaction((tx) =>
      readProgramAccessView(db, tx, programId, uid, programAccessNowMillis));
  } catch {
    // A source that fails its contract gets no view, as in the trigger.
    return null;
  }
}

/**
 * A view to create, or null when the account already has one: a stale view
 * is the refresh migration's to repair, never a conflict here.
 */
async function newProgramAccessViewRow(db, programId, uid) {
  const existing = await db.collection("programAccessViews")
    .doc(`${programId}__${uid}`).get();
  return existing.exists ? null : programAccessViewRow(db, programId, uid);
}

/** Every field of a view; the refresh rewrites any that differ. */
const programAccessViewFields = [
  "programId", "organizerId", "uid", "ownerUid", "role", "status",
  "activeFromMillis", "expiresAtMillis", "duties", "pickupAll",
  "pickupScoped", "hotelAll", "hotelScoped", "functionAll", "functionScoped",
  "programAll", "workPickup", "workHotel", "workFunction", "arrivalRoutes", "tripRoutes",
  "assignments",
  "grantExpiresAtMillis", "organizerManager", "revision", "version",
];

/**
 * Each current organizer manager of a programme's organizer who did not
 * create it and has no view yet: the view the triggers would write now.
 */
async function newOrganizerManagerViewEntries(db, programId, program) {
  if (!validId(programId) || !validId(program.organizerId)) return [];
  const organizer = (await db.collection("organizers")
    .doc(program.organizerId).get()).data();
  const {organizerManagers} = functionsProgramAccessView();
  const entries = [];
  for (const uid of organizerManagers(organizer)) {
    if (uid === program.createdBy || !validId(uid)) continue;
    const row = await newProgramAccessViewRow(db, programId, uid);
    if (row) entries.push({targetId: `${programId}__${uid}`, data: row});
  }
  return entries;
}

let programWorkViewModule = null;
function functionsProgramWorkViews() {
  try {
    programWorkViewModule ??= createFunctionsRequire()(
      "./lib/programs/programWorkViews.js");
  } catch (error) {
    throw new Error(
      "The program-work-views migration needs compiled Functions; run " +
      `\`npm --prefix functions run build\` first (${error.message}).`,
    );
  }
  return programWorkViewModule;
}

/** A programme's work summary from its current source, read only. */
async function programWorkSummaryRow(db, programId) {
  const {readProgramWorkSummary} = functionsProgramWorkViews();
  try {
    return await db.runTransaction((tx) =>
      readProgramWorkSummary(db, tx, programId));
  } catch {
    // A source that fails its contract gets no view, as in the trigger.
    return null;
  }
}

/** One resource label from its current source, read only. */
async function programResourceViewRow(db, kind, resourceId) {
  const {readProgramResourceView} = functionsProgramWorkViews();
  try {
    return await db.runTransaction((tx) =>
      readProgramResourceView(db, tx, kind, resourceId));
  } catch {
    return null;
  }
}

let programDoorLiveModules = null;
function functionsProgramDoorLive() {
  try {
    const load = createFunctionsRequire();
    programDoorLiveModules ??= {
      door: load("./lib/programs/programDoorViews.js"),
      board: load("./lib/programs/programLiveBoardViews.js"),
    };
  } catch (error) {
    throw new Error(
      "The program-door-views and program-live-board-views migrations need " +
      `compiled Functions; run \`npm --prefix functions run build\` first (${error.message}).`,
    );
  }
  return programDoorLiveModules;
}

const programDoorLiveNowMillis = Date.now();

/** A read model row from current sources, or null when it exists or cannot be built. */
async function newView(db, collection, id, build) {
  const existing = await db.collection(collection).doc(id).get();
  if (existing.exists) return null;
  try {
    return await db.runTransaction(build);
  } catch {
    // A source that fails its contract gets no view, as in the trigger.
    return null;
  }
}

let programGuestDirectoryModule = null;
function guestDirectoryViews() {
  try {
    programGuestDirectoryModule ??= createFunctionsRequire()(
      "./lib/programs/programGuestDirectoryViews.js");
  } catch (error) {
    throw new Error(
      "The program-guest-directory-views migration needs compiled Functions; " +
      `run \`npm --prefix functions run build\` first (${error.message}).`,
    );
  }
  return programGuestDirectoryModule;
}

/** One guest directory step: every source row without a view gets one. */
function guestDirectoryStep(source, kind) {
  return {
    source,
    target: "programGuestDirectoryViews",
    skipReason: "no programme or organizer, a guest whose name is not " +
      "disclosable, or already viewed",
    targetId: (id) => validId(id) ? `${kind}__${id}` : null,
    transform: (data, id, db) => newView(db, "programGuestDirectoryViews",
      `${kind}__${id}`, (tx) => guestDirectoryViews()
        .readProgramGuestDirectoryRow(db, tx, kind, id)),
  };
}

let programSettingViewModule = null;
function settingViews() {
  try {
    programSettingViewModule ??= createFunctionsRequire()(
      "./lib/programs/programWhatsapp/settingViews.js");
  } catch (error) {
    throw new Error(
      "The program-setting-views migration needs compiled Functions; run " +
      `\`npm --prefix functions run build\` first (${error.message}).`,
    );
  }
  return programSettingViewModule;
}

let organizerAccountViewModules = null;
function accountViews() {
  try {
    const load = createFunctionsRequire();
    organizerAccountViewModules ??= {
      account: load("./lib/hostReadModels/organizerAccountViews.js"),
      owner: load("./lib/hostReadModels/organizerOwnerViewStore.js"),
    };
  } catch (error) {
    throw new Error(
      "The host-organizer-account-views migration needs compiled Functions; " +
      `run \`npm --prefix functions run build\` first (${error.message}).`,
    );
  }
  return organizerAccountViewModules;
}

const organizerAccountNow = new Date();

let hostFormViewModule = null;
function formViews() {
  try {
    hostFormViewModule ??= createFunctionsRequire()(
      "./lib/hostReadModels/formViewStore.js");
  } catch (error) {
    throw new Error(
      "The host-form-views migration needs compiled Functions; run " +
      `\`npm --prefix functions run build\` first (${error.message}).`,
    );
  }
  return hostFormViewModule;
}

let hostCrmViewModules = null;
function crmViews() {
  try {
    const load = createFunctionsRequire();
    hostCrmViewModules ??= {
      sources: load("./lib/hostReadModels/audienceSourceViewStore.js"),
      candidates: load("./lib/hostReadModels/contactMergeCandidateViewStore.js"),
    };
  } catch (error) {
    throw new Error(
      "The host-crm-views migration needs compiled Functions; run " +
      `\`npm --prefix functions run build\` first (${error.message}).`,
    );
  }
  return hostCrmViewModules;
}

/**
 * The duplicate candidate views one contact starts: a view for each partner
 * whose id sorts after it, so each pair is planned once. Pairs that already
 * have a view are left alone.
 */
async function contactCandidateViews(db, data, contactId) {
  if (!validId(contactId) || !validId(data?.organizerId)) return [];
  const {candidates} = crmViews();
  const partners = await candidates.mergeCandidateSourcePartners(db,
    data.organizerId, contactId);
  const entries = [];
  for (const partner of partners) {
    if (partner <= contactId) continue;
    const pair = [contactId, partner];
    const view = await newView(db, "hostContactMergeCandidateViews",
      candidates.organizerContactMergeCandidateViewId(data.organizerId, pair),
      (tx) => candidates.readContactMergeCandidateView(db, tx,
        data.organizerId, pair));
    if (view) entries.push({targetId: view.candidateId, data: view});
  }
  return entries;
}

let guestEventStatusModule = null;
function guestEventStatuses() {
  try {
    guestEventStatusModule ??=
      createFunctionsRequire()("./lib/guestEvents/guestEventStatus.js");
  } catch (error) {
    throw new Error(
      "The guest-roster-links migration needs compiled Functions; run " +
      `\`npm --prefix functions run build\` first (${error.message}).`,
    );
  }
  return guestEventStatusModule;
}

/** The (at most two) roster rows linked to a guest at an event, by id. */
async function linkedAttendeeIds(db, eventId, uid) {
  const rows = await db.collection("eventAttendees").where("eventId", "==", eventId)
    .where("linkedUid", "==", uid).limit(2).get();
  return rows.docs.map((doc) => doc.id).sort();
}

let programArrivalViewModule = null;
function functionsProgramArrivalViews() {
  try {
    programArrivalViewModule ??= createFunctionsRequire()(
      "./lib/programs/programArrivalViews.js");
  } catch (error) {
    throw new Error(
      "The program-arrival-views migration needs compiled Functions; run " +
      `\`npm --prefix functions run build\` first (${error.message}).`,
    );
  }
  return programArrivalViewModule;
}

/** A read model row from current sources, or null when it exists or cannot be built. */
async function newArrivalView(db, collection, id, build) {
  const existing = await db.collection(collection).doc(id).get();
  if (existing.exists) return null;
  try {
    return await db.runTransaction(build);
  } catch {
    // A source that fails its contract gets no view, as in the trigger.
    return null;
  }
}

let programTripViewModule = null;
function functionsProgramTripViews() {
  try {
    programTripViewModule ??= createFunctionsRequire()(
      "./lib/programs/programTripViews.js");
  } catch (error) {
    throw new Error(
      "The program-trip-views migration needs compiled Functions; run " +
      `\`npm --prefix functions run build\` first (${error.message}).`,
    );
  }
  return programTripViewModule;
}

let programWhatsappThreadViewModule = null;
function functionsProgramWhatsappThreadViews() {
  try {
    programWhatsappThreadViewModule ??= createFunctionsRequire()(
      "./lib/programs/programWhatsapp/threadViews.js");
  } catch (error) {
    throw new Error(
      "The program-whatsapp-thread-views migration needs compiled Functions; run " +
      `\`npm --prefix functions run build\` first (${error.message}).`,
    );
  }
  return programWhatsappThreadViewModule;
}

let organizerProgramViewModule = null;
function functionsOrganizerProgramViews() {
  try {
    organizerProgramViewModule ??= createFunctionsRequire()(
      "./lib/programs/organizerProgramViews.js");
  } catch (error) {
    throw new Error(
      "The organizer-program-views migration needs compiled Functions; run " +
      `\`npm --prefix functions run build\` first (${error.message}).`,
    );
  }
  return organizerProgramViewModule;
}

/** A trip or hotel inbound row from current sources, or null when it exists or cannot be built. */
async function newTripView(db, collection, id, build) {
  const existing = await db.collection(collection).doc(id).get();
  if (existing.exists) return null;
  try {
    return await db.runTransaction(build);
  } catch {
    // A source that fails its contract gets no view, as in the trigger.
    return null;
  }
}

let programStaffViewModule = null;
function functionsProgramStaffViews() {
  try {
    programStaffViewModule ??= createFunctionsRequire()(
      "./lib/programs/programStaffViews.js");
  } catch (error) {
    throw new Error(
      "The program-staff-views migration needs compiled Functions; run " +
      `\`npm --prefix functions run build\` first (${error.message}).`,
    );
  }
  return programStaffViewModule;
}

const programStaffNowMillis = Date.now();

/** A staff view from current sources, or null when it exists or cannot be built. */
async function newStaffView(db, programId, uid) {
  const existing = await db.collection("programStaffViews")
    .doc(`${programId}__${uid}`).get();
  if (existing.exists) return null;
  try {
    return await db.runTransaction((tx) =>
      functionsProgramStaffViews().readProgramStaffView(db, tx, programId, uid,
        programStaffNowMillis));
  } catch {
    // A source that fails its contract gets no view, as in the trigger.
    return null;
  }
}

const screenReadViewModules = {};
/** A compiled Functions read model module for the screen-read migrations. */
function functionsScreenReadViews(migration, modulePath) {
  try {
    screenReadViewModules[modulePath] ??= createFunctionsRequire()(modulePath);
  } catch (error) {
    throw new Error(
      `The ${migration} migration needs compiled Functions; run ` +
      `\`npm --prefix functions run build\` first (${error.message}).`,
    );
  }
  return screenReadViewModules[modulePath];
}
const roomViews = () => functionsScreenReadViews("program-hotel-room-views",
  "./lib/programs/programHotelRoomViews.js");
const assignmentViews = () => functionsScreenReadViews("host-assignment-views",
  "./lib/hostWork/hostAssignmentViews.js");
const momentViews = () => functionsScreenReadViews("organizer-moment-views",
  "./lib/moments/organizerMomentViews.js");
const hostAssignmentNowMillis = Date.now();

const profilePromptCatalog = JSON.parse(fs.readFileSync(
  new URL("../../../contracts/catalogs/profile_prompts.json", import.meta.url), "utf8"));
const defaultPrompt = profilePromptCatalog.prompts.find(
  (prompt) => prompt.id === profilePromptCatalog.defaultPromptIds[0]
) ?? profilePromptCatalog.prompts[0];

function collapseStackedPromptBlankLines(value) {
  return value.replace(/\r\n/g, "\n").replace(/\r/g, "\n")
    .replace(/\n[ \t]*\n(?:[ \t]*\n)+/g, "\n\n");
}

/**
 * Registered copy-forward migrations for the November 2026 Firestore
 * consolidation. Each entry copies documents from retired collections into
 * their replacement; see ./copy_forward.mjs for the guarantees.
 * Lanes add their migration here; the CLI runs them by name or in order.
 */

export const MIGRATIONS = [
  {
    name: "event-schema-fill",
    description:
      "Events created before today's Event contract get the fields it requires, " +
      "worked out from what each event already stores: the title the apps " +
      "already show, city and market from its discovery market, that market's " +
      "timezone, local date and start time, setup revision 1, event-set setup " +
      "defaults, publication state published, and a meeting location from its " +
      "meeting point and coordinates when it has them. Nothing present changes.",
    steps: [
      {
        kind: "fill",
        collection: "events",
        fill: (data) => eventSchemaFill(data, functionsMarket),
      },
    ],
  },
  {
    name: "event-organizer-summary",
    description:
      "Explore reads the organizer's name, place, host name, tags, rating and " +
      "visibility from events/{eventId}.organizerSummary (#1340) instead of " +
      "looking organizers up by id. Every event whose summary is missing or " +
      "differs from its organizer's public projection (publicOrganizers) gets " +
      "the summary the event and organizer triggers write; an organizer with " +
      "no public projection gets the hidden summary. Only organizerSummary is " +
      "written, with a last-update-time precondition. No other field changes " +
      "and nothing is deleted; a rerun writes nothing. Build Functions first.",
    steps: [
      {
        kind: "fill",
        collection: "events",
        refresh: ["organizerSummary"],
        fill: async (data, id, db) => {
          if (!validId(data.organizerId)) return null;
          const {organizerSummaryFrom} = functionsOrganizerSummary();
          const organizer = await db.collection("publicOrganizers").doc(data.organizerId).get();
          return {organizerSummary: organizerSummaryFrom(organizer.exists ? organizer.data() : undefined)};
        },
      },
    ],
  },
  {
    name: "host-membership-savings",
    description:
      "My memberships reads each membership's savings from " +
      "hostMemberships/{id}.savedInPaise and memberPricedBookings, which the " +
      "onHostMembershipBenefitUseWritten trigger keeps current. Every " +
      "membership whose stored totals are missing or differ from its " +
      "hostMembershipBenefitUses that are not released gets the totals the " +
      "trigger would hold, counted with the trigger's own function; a " +
      "membership with no counted uses and no stored totals is left alone. " +
      "Only those two fields are written, with a last-update-time " +
      "precondition, so a membership the trigger moved meanwhile is left for " +
      "the next run. Uses are never changed and a rerun writes nothing. " +
      "Build Functions first.",
    steps: [
      {
        kind: "fill",
        collection: "hostMemberships",
        refresh: ["savedInPaise", "memberPricedBookings"],
        fill: async (data, id, db) => {
          if (!validId(id)) return null;
          const {membershipSavingsTotals} = functionsMembershipSavings();
          const totals = membershipSavingsTotals(await membershipBenefitUses(db, id));
          const stored = data.savedInPaise !== undefined || data.memberPricedBookings !== undefined;
          if (!stored && totals.savedInPaise === 0 && totals.memberPricedBookings === 0) return null;
          return totals;
        },
      },
    ],
  },
  {
    name: "schedule-locks",
    description:
      "organizerScheduleLocks and userEventScheduleLocks into scheduleLocks " +
      "with organizer_/user_ prefixed ids.",
    steps: [
      {
        source: "organizerScheduleLocks",
        target: "scheduleLocks",
        targetId: (id) => `organizer_${id}`,
        transform: (data) => ({...data, ownerType: "organizer"}),
      },
      {
        source: "userEventScheduleLocks",
        target: "scheduleLocks",
        targetId: (id) => `user_${id}`,
        transform: (data) => ({...data, ownerType: "user"}),
      },
    ],
  },
  {
    name: "event-policy",
    description:
      "events with capacity and price terms but no stored eventPolicy get the " +
      "policy an event receives with its first terms; events with gender " +
      "counts but empty cohortCounts get the matching cohort counts.",
    steps: [
      {
        kind: "fill",
        collection: "events",
        fill: (data) => {
          const fields = {};
          if (data.eventPolicy === undefined || data.eventPolicy === null) {
            // Load outside the try: a missing build is an error, not "no terms".
            const {initialPolicyFromTerms} = functionsEventPolicy();
            try {
              fields.eventPolicy = initialPolicyFromTerms(data);
            } catch {
              // No capacity and price terms yet: nothing to store.
            }
          }
          const cohorts = cohortCountsFromGenderCounts(data.genderCounts);
          const storedCohorts = data.cohortCounts ?? {};
          if (Object.keys(storedCohorts).length === 0 && Object.keys(cohorts).length > 0) {
            fields.cohortCounts = cohorts;
          }
          return Object.keys(fields).length > 0 ? fields : null;
        },
      },
    ],
  },
  {
    name: "profile-bio-prompts",
    description:
      "users with a legacy bio and no profile prompts get the bio as their " +
      "first prompt answer, so nothing reads bio any more. bio itself stays.",
    steps: [
      {
        kind: "fill",
        collection: "users",
        fill: (data) => {
          const bio = typeof data.bio === "string" ?
            collapseStackedPromptBlankLines(data.bio).trim() : "";
          const prompts = (data.profilePrompts ?? [])
            .filter((prompt) => typeof prompt?.answer === "string" && prompt.answer.trim());
          if (!bio || prompts.length > 0) return null;
          return {profilePrompts: [{
            promptId: defaultPrompt.id,
            prompt: defaultPrompt.title,
            answer: bio,
          }]};
        },
      },
    ],
  },
  {
    name: "published-reveal-index",
    description:
      "Event Success plans revealed before publishedRevealRoundIndex existed " +
      "get the round they show as revealed, so nothing infers it from " +
      "revealStatus any more.",
    steps: [
      {
        kind: "fill",
        collection: "eventSuccessPlans",
        fill: (data) => {
          if (data.revealStatus !== "revealed") return null;
          if (Number.isInteger(data.publishedRevealRoundIndex)) return null;
          const active = Number.isInteger(data.activeRevealRoundIndex) ?
            Math.max(0, data.activeRevealRoundIndex) : 0;
          return {publishedRevealRoundIndex: active};
        },
      },
    ],
  },
  {
    name: "waitlist-host-leads",
    description:
      "launchWaitlist entries that predate host-lead receipts but already " +
      "have a Sales inbound intent get hostLead {isNew: false}, so joinWaitlist " +
      "no longer queries salesInboundIntents to avoid recounting them.",
    steps: [
      {
        kind: "fill",
        collection: "launchWaitlist",
        fill: async (data, id, db) => {
          if (data.hostLead !== undefined && data.hostLead !== null) return null;
          const intents = await db.collection("salesInboundIntents")
            .where("waitlistId", "==", id).limit(1).get();
          if (intents.empty) return null;
          return {hostLead: {eventId: preReceiptHostLeadId(id, data), isNew: false}};
        },
      },
    ],
  },
  {
    name: "catch-booking-roster",
    description:
      "Every eventBookings booking gets one eventAttendees roster row " +
      "and links to it (attendeeId). The booking stays the one record of the " +
      "guest's booking; the row is the Host's view of that guest. Existing " +
      "linked rows are reused, never replaced; nothing is deleted.",
    steps: [
      {
        source: "eventBookings",
        target: "eventAttendees",
        skipReason: "already has a roster row",
        targetId: async (id, data, db) => {
          if (typeof data.eventId !== "string" || typeof data.uid !== "string") return null;
          if (typeof data.attendeeId === "string" && data.attendeeId) return null;
          const linked = await linkedAttendeeId(db, data.eventId, data.uid);
          if (linked.ambiguous || linked.id) return null;
          return uidAttendeeId(data.eventId, data.uid);
        },
        transform: async (data, id, db) => {
          const {projection, admin} = functionsRoster();
          const profile = (await db.collection("publicProfiles").doc(data.uid).get()).data();
          const name = typeof profile?.name === "string" && profile.name.trim() ?
            profile.name.trim() : data.uid;
          return projection.catchBookingAttendeeDocument({source: data,
            sourceExists: true, existing: undefined, organizerId: data.organizerId,
            displayName: name, now: admin.firestore.Timestamp.now()});
        },
      },
      {
        kind: "fill",
        collection: "eventBookings",
        fill: async (data, id, db) => {
          if (typeof data.attendeeId === "string" && data.attendeeId) return null;
          if (typeof data.eventId !== "string" || typeof data.uid !== "string") return null;
          const linked = await linkedAttendeeId(db, data.eventId, data.uid);
          if (linked.ambiguous) return null;
          return {attendeeId: linked.id ?? uidAttendeeId(data.eventId, data.uid)};
        },
      },
    ],
  },
  {
    name: "guest-booking-facts",
    description:
      "Each person with an organizerCommunityMemberships decision gets one " +
      "guestBookingFacts document holding every organizer's membership " +
      "state, as decideOrganizerCommunityMembership now writes it. One " +
      "document per person, created from their first membership by id; " +
      "existing documents are never replaced.",
    steps: [
      {
        source: "organizerCommunityMemberships",
        target: "guestBookingFacts",
        skipReason: "another membership of the same person creates the document",
        targetId: async (id, data, db) => {
          if (typeof data.uid !== "string" || !data.uid) return null;
          const first = await db.collection("organizerCommunityMemberships")
            .where("uid", "==", data.uid).orderBy("__name__").limit(1).get();
          return first.docs[0]?.id === id ? data.uid : null;
        },
        transform: async (data, id, db) => {
          const rows = await db.collection("organizerCommunityMemberships")
            .where("uid", "==", data.uid).get();
          const communityMemberships = {};
          let updatedAtMillis = 1;
          for (const row of rows.docs) {
            const m = row.data();
            if (typeof m.organizerId !== "string" ||
                !["active", "revoked"].includes(m.state)) continue;
            communityMemberships[m.organizerId] = {state: m.state,
              revision: m.revision, decisionId: m.lastDecisionId,
              updatedAtMillis: m.updatedAtMillis};
            updatedAtMillis = Math.max(updatedAtMillis, m.updatedAtMillis ?? 1);
          }
          if (Object.keys(communityMemberships).length === 0) return null;
          return {schemaVersion: 1, uid: data.uid, updatedAtMillis,
            communityMemberships};
        },
      },
    ],
  },
  {
    name: "event-chat-directory",
    description:
      "Every person with an event chat membership, a Catch booking or a " +
      "linked roster row gets the eventChatDirectoryEntries row the " +
      "directory triggers now keep, computed from current access. A row " +
      "reached from several sources is created from the first of chat " +
      "membership, booking, roster row; existing rows are never replaced.",
    steps: [
      {
        source: "eventChatMemberships",
        target: "eventChatDirectoryEntries",
        skipReason: "no current access",
        targetId: (id, data) => `${data.eventId}_${data.uid}`,
        transform: (data, id, db) => chatDirectoryRow(db, data.eventId, data.uid),
      },
      {
        source: "eventBookings",
        target: "eventChatDirectoryEntries",
        skipReason: "no current access, or created from the chat membership",
        targetId: async (id, data, db) => {
          if (!["signedUp", "attended"].includes(data.status)) return null;
          const member = await db.collection("eventChatMemberships")
            .where("eventId", "==", data.eventId).where("uid", "==", data.uid)
            .limit(1).get();
          return member.empty ? `${data.eventId}_${data.uid}` : null;
        },
        transform: (data, id, db) => chatDirectoryRow(db, data.eventId, data.uid),
      },
      {
        source: "eventAttendees",
        target: "eventChatDirectoryEntries",
        skipReason: "no linked account or current access, or created from another source",
        targetId: async (id, data, db) => {
          if (typeof data.linkedUid !== "string" || !data.linkedUid) return null;
          const [member, booking] = await Promise.all([
            db.collection("eventChatMemberships").where("eventId", "==", data.eventId)
              .where("uid", "==", data.linkedUid).limit(1).get(),
            db.collection("eventBookings").doc(`${data.eventId}_${data.linkedUid}`).get(),
          ]);
          const booked = ["signedUp", "attended"].includes(booking.data()?.status);
          return member.empty && !booked ? `${data.eventId}_${data.linkedUid}` : null;
        },
        transform: (data, id, db) => chatDirectoryRow(db, data.eventId, data.linkedUid),
      },
    ],
  },
  {
    name: "booking-payments",
    description:
      "In-app Catch booking payments move from payments into the guest-payment " +
      "ledger with purpose booking, keeping their ids so bookings still point " +
      "at them. Old documents stay in place.",
    steps: [
      {
        source: "payments",
        target: "guestPayments",
        targetId: (id) => id,
        transform: (data) => ({...data, purpose: "booking"}),
      },
    ],
  },
  {
    name: "event-bookings",
    description:
      "The booking collection is renamed from eventParticipations to " +
      "eventBookings (Nov 2026). Every eventParticipations document is " +
      "copied to eventBookings with the same id and the same data. A booking " +
      "already in eventBookings is never replaced, and nothing is deleted; " +
      "the onEventBookingMirroredToLegacy trigger then keeps " +
      "eventParticipations as a read-only copy for released apps until " +
      "phase 2 retires it. Deploy rules, indexes and Functions first.",
    steps: [
      {
        source: "eventParticipations",
        target: "eventBookings",
        targetId: (id) => id,
        transform: (data) => ({...data}),
      },
    ],
  },
  {
    name: "guest-event-read-models",
    description:
      "Every published event gets the eventGuestEntries document and every " +
      "guest with a record of their own on an event (a booking, roster row, " +
      "website or offer payment, application or offer invitation) gets the " +
      "guestEventStatuses row the guest event triggers now keep, computed " +
      "from current records. A row reached from several records is created " +
      "from the first; existing documents are never replaced. Build " +
      "Functions first.",
    steps: [
      {
        source: "events",
        target: "eventGuestEntries",
        skipReason: "not published",
        targetId: (id, data) => data.publicationState === "published" ? id : null,
        transform: (data, id, db) => {
          const {eventGuestEntry} = functionsGuestEvents().entry;
          return db.runTransaction((tx) => eventGuestEntry(db, tx, id, guestEventNowMillis));
        },
      },
      guestEventStatusStep("eventBookings", "eventId", "uid"),
      guestEventStatusStep("eventAttendees", "eventId", "linkedUid"),
      guestEventStatusStep("guestPayments", "eventId", "recipientUid",
        (data) => ["publicEvent", "offer"].includes(data.purpose)),
      guestEventStatusStep("organizerApplications", "targetId", "linkedUid",
        (data) => data.targetKind === "event"),
      guestEventStatusStep("organizerEventOfferRecipients", "eventId", "recipientUid"),
    ],
  },
  {
    name: "guest-event-cards",
    description:
      "Guest booking lists read event cards instead of joining events " +
      "(#1340). Every Catch booking without a guestEventStatuses row " +
      "(waitlisted and cancelled bookings had none) gets one; older rows " +
      "get participationStatus and eventCard; every saved-event edge gets " +
      "eventCard. All from current records, as the guest event triggers now " +
      "write them. Only absent or null fields are added and no document is " +
      "replaced or removed. Build Functions first.",
    steps: [
      missingGuestEventStatusStep("eventBookings", "eventId", "uid"),
      {
        kind: "fill",
        collection: "guestEventStatuses",
        fill: async (data, id, db) => {
          const wanted = ["participationStatus", "eventCard"]
            .filter((field) => data[field] === undefined || data[field] === null);
          if (wanted.length === 0 || !validId(data.eventId) || !validId(data.uid)) {
            return null;
          }
          const {guestEventStatus} = functionsGuestEvents().status;
          const row = await db.runTransaction((tx) => guestEventStatus({db, tx,
            eventId: data.eventId, uid: data.uid, nowMillis: guestEventNowMillis}));
          const fields = Object.fromEntries(wanted
            .filter((field) => row && row[field] !== null && row[field] !== undefined)
            .map((field) => [field, row[field]]));
          return Object.keys(fields).length > 0 ? fields : null;
        },
      },
      {
        kind: "fill",
        collection: "savedEvents",
        fill: async (data, id, db) => {
          if ((data.eventCard !== undefined && data.eventCard !== null) ||
              !validId(data.eventId)) {
            return null;
          }
          const event = await db.collection("events").doc(data.eventId).get();
          if (!event.exists) return null;
          const card = functionsGuestEvents().card.guestEventCard(data.eventId,
            event.data());
          return card ? {eventCard: card} : null;
        },
      },
    ],
  },
  {
    name: "host-form-version-filters",
    description:
      "Form-scoped response inboxes read a published form version's answer " +
      "filters from hostFormVersionFilters (#1339) instead of the " +
      "listOrganizerFormResponses callable. Every organizerFormVersions " +
      "document without a view gets one, computed from the version exactly " +
      "as the new trigger writes it. Existing views are never replaced and " +
      "versions are never changed. Build Functions first.",
    steps: [
      {
        source: "organizerFormVersions",
        target: "hostFormVersionFilters",
        skipReason: "no owner, form, version number or definition",
        targetId: (id) => id,
        transform: (data, id) =>
          functionsFormVersionFilters().hostFormVersionFilter(id, data),
      },
    ],
  },
  {
    name: "host-event-request-views",
    description:
      "Host Requests read hostEventRequestViews (#1339) instead of the " +
      "listOrganizerRequests callable. Every active coming event with anyone " +
      "waiting gets its view, computed from the event, its waitlisted " +
      "participations, public profiles and contact summaries exactly as the " +
      "new triggers write it. Events with nobody waiting get none. Existing " +
      "views are never replaced; events and participations are never " +
      "changed. Build Functions first.",
    steps: [
      {
        source: "events",
        target: "hostEventRequestViews",
        skipReason: "not an active coming event with someone waiting",
        targetId: (id, data) => data.status === "active" &&
          validId(data.organizerId) ? id : null,
        transform: (data, id, db) => requestViewRow(db, id),
      },
    ],
  },
  {
    name: "host-contact-detail-views",
    description:
      "The Host person page reads hostContactDetailViews through a listener " +
      "(#1339) instead of the getOrganizerContactDetail callable. Every shown " +
      "contact (not deleted, hidden or merged, with a trait row of its " +
      "organizer) without a view gets one, with the traits, revenue and " +
      "newest 100 event rows the callable returns, as the new triggers write " +
      "it. Existing views are never replaced; contacts, traits, event edges, " +
      "events and payments are never changed. Build Functions first.",
    steps: [
      {
        source: "organizerContacts",
        target: "hostContactDetailViews",
        skipReason: "deleted, hidden, merged or without a trait row",
        targetId: (id, data) => validId(id) && validId(data.organizerId) &&
          data.deletedAt == null && data.hiddenAt == null &&
          data.identityState !== "merged" ? id : null,
        transform: (data, id, db) => contactDetailViewRow(db, id),
      },
    ],
  },
  {
    name: "host-application-detail-views",
    description:
      "The Host response, offer and response-offer pages read " +
      "hostApplicationDetailViews through a listener (#1339) instead of the " +
      "getOrganizerApplicationDetail callable. Every application without a " +
      "view gets one, with exactly the detail the callable returns (no " +
      "answers or outreach once its response is withdrawn), as the new " +
      "triggers write it. Existing views are never replaced; applications, " +
      "responses, origins and memberships are never changed. Build Functions " +
      "first.",
    steps: [
      {
        source: "organizerApplications",
        target: "hostApplicationDetailViews",
        skipReason: "no owner",
        targetId: (id, data) => validId(id) && validId(data.organizerId) ?
          id : null,
        transform: (data, id, db) => applicationDetailViewRow(db, id),
      },
    ],
  },
  {
    name: "guest-messaging-permissions",
    description:
      "The guest's messaging settings page reads guestMessagingPermissions " +
      "instead of the listParticipantMessagingPreferences callable. Every " +
      "Catch and organizer communication preference without a row gets one, " +
      "with the summary the callable computes from the preference and the " +
      "receipts it names, as the new triggers write it. Existing rows are " +
      "never replaced; preferences and receipts are never changed. Build " +
      "Functions first.",
    steps: [
      {
        source: "catchCommunicationPreferences",
        target: "guestMessagingPermissions",
        skipReason: "no guest",
        targetId: (id, data) => validId(data.uid) && data.uid === id ?
          `catchpref_${id}` : null,
        transform: (data, id, db) => guestMessagingPermissionRow(db,
          {scope: "catch", uid: id}),
      },
      {
        source: "organizerCommunicationPreferences",
        target: "guestMessagingPermissions",
        skipReason: "no guest or organizer",
        targetId: (id, data) => validId(data.uid) && validId(data.organizerId) ?
          id : null,
        transform: (data, id, db) => guestMessagingPermissionRow(db,
          {scope: "organizer", preferenceId: id}),
      },
    ],
  },
  {
    name: "participant-form-profile-views",
    description:
      "The guest's form profile list and review read " +
      "participantFormProfileViews and participantIntakeProfileViews " +
      "instead of the listParticipantFormProfiles and " +
      "getParticipantFormProfile callables. Every form profile proposal still " +
      "available to its guest gets a review row, and every intake profile " +
      "gets its revision view, computed from current sources as the new " +
      "triggers write them. Withdrawn or unavailable proposals get none. " +
      "Existing rows are never replaced; proposals, responses, cards and " +
      "intake profiles are never changed. Build Functions first.",
    steps: [
      {
        source: "participantFormProfileProposals",
        target: "participantFormProfileViews",
        skipReason: "no guest, or the proposal is no longer available",
        targetId: (id, data) => validId(data.uid) ? id : null,
        transform: (data, id, db) => formProfileViewRow(db, id),
      },
      {
        source: "participantIntakeProfiles",
        target: "participantIntakeProfileViews",
        skipReason: "the account is deleted",
        targetId: (id) => validId(id) ? id : null,
        transform: (data, id, db) => intakeProfileViewRow(db, id),
      },
    ],
  },
  {
    name: "program-access-views",
    description:
      "Programme staff screens read programAccessViews (#1339) instead of " +
      "the getProgramWorkAccess callable, and security rules authorize " +
      "direct programme reads from them. Every programme owner and every " +
      "staff grant without a view gets one, with the owner-approval proof " +
      "and every expiry folded in, as the new triggers write it. Revoked " +
      "or unapproved grants get an inactive view. Existing views are never " +
      "replaced; programmes and grants are never changed. Build Functions " +
      "first.",
    steps: [
      {
        source: "organizerPrograms",
        target: "programAccessViews",
        skipReason: "no creator recorded, or the creator already has a view",
        targetId: (id, data) => validId(id) &&
          typeof data.createdBy === "string" && validId(data.createdBy) ?
          `${id}__${data.createdBy}` : null,
        transform: (data, id, db) =>
          newProgramAccessViewRow(db, id, data.createdBy),
      },
      {
        source: "programStaffGrants",
        target: "programAccessViews",
        skipReason: "not a grant of an existing programme, the owner's own, or " +
          "already viewed",
        targetId: (id, data) => validId(data.programId) &&
          validId(data.uid) && id === `${data.programId}__${data.uid}` ?
          id : null,
        transform: (data, id, db) =>
          newProgramAccessViewRow(db, data.programId, data.uid),
      },
    ],
  },
  {
    name: "program-access-views-refresh",
    description:
      "Repairs programAccessViews that a trigger wrote before it knew every " +
      "field (the live duty assignments and the grant expiry, #1339). Every " +
      "view that differs from what the triggers would compute now is " +
      "rewritten, with a last-update-time precondition, so a view changed " +
      "meanwhile is left for the next run. Views are derived: programmes and " +
      "grants are never changed, nothing is deleted, a source that cannot " +
      "produce a view leaves its view untouched, and a rerun writes " +
      "nothing. Run after program-access-views. Build Functions first.",
    steps: [
      {
        kind: "fill",
        collection: "programAccessViews",
        refresh: programAccessViewFields,
        fill: async (data, id, db) => {
          if (!validId(data.programId) || typeof data.uid !== "string" ||
              !validId(data.uid)) return null;
          return programAccessViewRow(db, data.programId, data.uid);
        },
      },
    ],
  },
  {
    name: "program-access-views-organizer-managers",
    description:
      "The Host app gates the programme list and detail on programAccessViews " +
      "offline, so organizer managers who did not create a programme need a " +
      "view too (#2175). Every current manager of a programme's organizer " +
      "without a view gets one: setup authority only (organizerManager true, " +
      "status inactive, no duty), as the new organizer trigger writes it. " +
      "Then every existing view that differs from what the triggers would " +
      "compute now is rewritten under a last-update-time precondition, which " +
      "adds the organizerManager flag to owner and staff views. Programmes, " +
      "grants and organizers are never changed and nothing is deleted; a " +
      "rerun writes nothing. Build Functions first.",
    steps: [
      {
        source: "organizerPrograms",
        target: "programAccessViews",
        skipReason: "no organizer manager without a view, besides the creator",
        expand: (data, id, db) => newOrganizerManagerViewEntries(db, id, data),
      },
      {
        kind: "fill",
        collection: "programAccessViews",
        refresh: programAccessViewFields,
        fill: async (data, id, db) => {
          if (!validId(data.programId) || typeof data.uid !== "string" ||
              !validId(data.uid)) return null;
          return programAccessViewRow(db, data.programId, data.uid);
        },
      },
    ],
  },
  {
    name: "program-work-views",
    description:
      "The programme work shell reads programWorkSummaries and " +
      "programResourceViews (#1339) instead of the getProgramWorkAccess " +
      "callable. Every programme without a summary gets one, and every " +
      "pickup point, hotel and function without a view gets one, with only " +
      "the fields the callable returns, as the new triggers write them. " +
      "Existing views are never replaced; programmes and resources are " +
      "never changed. Build Functions first.",
    steps: [
      {
        source: "organizerPrograms",
        target: "programWorkSummaries",
        skipReason: "not a valid programme id",
        targetId: (id) => validId(id) ? id : null,
        transform: (data, id, db) => programWorkSummaryRow(db, id),
      },
      {
        source: "programPickupPoints",
        target: "programResourceViews",
        skipReason: "no programme or organizer, or not a valid id",
        targetId: (id, data) => validId(id) && validId(data.programId) ?
          `${data.programId}__pickupPoint__${id}` : null,
        transform: (data, id, db) =>
          programResourceViewRow(db, "pickupPoint", id),
      },
      {
        source: "programHotels",
        target: "programResourceViews",
        skipReason: "no programme or organizer, or not a valid id",
        targetId: (id, data) => validId(id) && validId(data.programId) ?
          `${data.programId}__hotel__${id}` : null,
        transform: (data, id, db) =>
          programResourceViewRow(db, "hotel", id),
      },
      {
        source: "programFunctions",
        target: "programResourceViews",
        skipReason: "no programme or organizer, or not a valid id",
        targetId: (id, data) => validId(id) && validId(data.programId) ?
          `${data.programId}__function__${id}` : null,
        transform: (data, id, db) =>
          programResourceViewRow(db, "function", id),
      },
    ],
  },
  {
    name: "program-door-views",
    description:
      "The programme door reads programDoorFunctions, programDoorRows and " +
      "programDoorJournalViews through listeners (#1339) instead of the " +
      "getProgramFunctionDoorView callable. Every function without a header, " +
      "every guest-at-function roster row (an allGuests function lists every " +
      "programme guest; a selectedGuests function its join rows) and every " +
      "door journal entry without a view gets one, with only the fields the " +
      "callable returned and never a contact field. Views the triggers have " +
      "already written are left alone; programmes, guests and journals are " +
      "never changed. Build Functions first.",
    steps: [
      {
        source: "programFunctions",
        target: "programDoorFunctions",
        skipReason: "no programme or organizer, or already viewed",
        targetId: (id) => validId(id) ? id : null,
        transform: (data, id, db) => newView(db, "programDoorFunctions", id,
          (tx) => functionsProgramDoorLive().door
            .readProgramDoorFunction(db, tx, id)),
      },
      {
        source: "programGuests",
        target: "programDoorRows",
        skipReason: "no programme, no function lists the guest, or already viewed",
        expand: async (data, id, db) => {
          if (!validId(id) || !validId(data.programId)) return [];
          const functions = await db.collection("programFunctions")
            .where("programId", "==", data.programId).limit(60).get();
          const entries = [];
          for (const fn of functions.docs) {
            const rowId = `${fn.id}__${id}`;
            const row = await newView(db, "programDoorRows", rowId,
              (tx) => functionsProgramDoorLive().door
                .readProgramDoorRow(db, tx, fn.id, id));
            if (row) entries.push({targetId: rowId, data: row});
          }
          return entries;
        },
      },
      {
        source: "programDoorJournal",
        target: "programDoorJournalViews",
        skipReason: "no programme, or already viewed",
        targetId: (id) => validId(id) ? id : null,
        transform: (data, id, db) => newView(db, "programDoorJournalViews", id,
          (tx) => functionsProgramDoorLive().door
            .readProgramDoorJournalView(db, tx, id)),
      },
    ],
  },
  {
    name: "program-live-board-views",
    description:
      "The live board reads programAlertViews and programTravelCountViews " +
      "through listeners (#1339) instead of the getProgramLiveBoard and " +
      "listProgramStaffAttention callables. Every staff attention alert still " +
      "inside its 24 hour window (one per run and duty), every disrupted " +
      "inbound journey's alert, and every programme's travel counts without " +
      "a view gets one, merged with its resolution, as the triggers write " +
      "them. Views the triggers have written are left alone; sends, legs " +
      "and resolutions are never changed. Build Functions first.",
    steps: [
      {
        source: "organizerMomentSends",
        target: "programAlertViews",
        skipReason: "not a live programme staff attention send, not the " +
          "run's first send, or already viewed",
        expand: async (data, id, db) => {
          if (data.actionKind !== "staffAttention" ||
              data.scopeKind !== "program" || !validId(data.scopeId) ||
              typeof data.runId !== "string" || typeof data.duty !== "string") {
            return [];
          }
          const {board} = functionsProgramDoorLive();
          let found = null;
          try {
            found = await db.runTransaction((tx) =>
              board.readStaffAttentionAlertView(db, tx, data.scopeId,
                data.runId, data.duty, programDoorLiveNowMillis));
          } catch {
            return [];
          }
          // Fanout sends of one run and duty share an alert: the earliest
          // send owns it.
          if (!found || found.sourceId !== id) return [];
          const viewId = board.programAlertViewId(data.scopeId,
            found.view.alertId);
          const existing = await db.collection("programAlertViews")
            .doc(viewId).get();
          return existing.exists ? [] : [{targetId: viewId, data: found.view}];
        },
      },
      {
        source: "programTravelLegs",
        target: "programAlertViews",
        skipReason: "not a disrupted inbound journey, or already viewed",
        expand: async (data, id, db) => {
          if (!validId(id) || !validId(data.programId)) return [];
          const {board} = functionsProgramDoorLive();
          const entries = [];
          for (const alertId of [`flight_${id}`, `readiness_${id}`]) {
            const viewId = board.programAlertViewId(data.programId, alertId);
            const view = await newView(db, "programAlertViews", viewId,
              (tx) => board.readTravelAlertView(db, tx, data.programId,
                alertId, id, programDoorLiveNowMillis));
            if (view) entries.push({targetId: viewId, data: view});
          }
          return entries;
        },
      },
      {
        source: "organizerPrograms",
        target: "programTravelCountViews",
        skipReason: "no organizer, or already viewed",
        targetId: (id) => validId(id) ? id : null,
        transform: (data, id, db) => newView(db, "programTravelCountViews", id,
          (tx) => functionsProgramDoorLive().board
            .readTravelCountView(db, tx, id)),
      },
    ],
  },
  {
    name: "program-arrival-views",
    description:
      "Arrivals, departures and the dispatcher's vendor list read " +
      "programArrivalViews, programDepartureViews and programVendorViews " +
      "through listeners (#1339) instead of the getProgramArrivalsRoster, " +
      "getProgramDeparturesRoster and listTransportVendors callables. Every " +
      "expected, ready or disrupted inbound journey, every outbound journey " +
      "to a hotel and every bound vendor without a view gets one, with only " +
      "the fields the callables returned and never a phone number. Views the " +
      "triggers have already written are left alone; journeys, stays, guests " +
      "and vendors are never changed. Run program-access-views-refresh " +
      "first, so access views carry their arrival routes. Build Functions " +
      "first.",
    steps: [
      {
        source: "programTravelLegs",
        target: "programArrivalViews",
        skipReason: "not an expected, ready or disrupted inbound journey, or already viewed",
        targetId: (id, data) => validId(id) && data.kind === "inbound" ? id : null,
        transform: (data, id, db) => newArrivalView(db, "programArrivalViews", id,
          (tx) => functionsProgramArrivalViews()
            .readProgramArrivalView(db, tx, id)),
      },
      {
        source: "programTravelLegs",
        target: "programDepartureViews",
        skipReason: "not an outbound journey to a hotel, or already viewed",
        targetId: (id, data) => validId(id) && data.kind === "outbound" ? id : null,
        transform: (data, id, db) => newArrivalView(db, "programDepartureViews", id,
          (tx) => functionsProgramArrivalViews()
            .readProgramDepartureView(db, tx, id)),
      },
      {
        source: "transportVendors",
        target: "programVendorViews",
        skipReason: "bound to no programme, or already viewed",
        expand: async (data, id, db) => {
          if (!validId(id) || !Array.isArray(data.programIds)) return [];
          const entries = [];
          for (const programId of data.programIds) {
            if (!validId(programId)) continue;
            const viewId = `${programId}__${id}`;
            const view = await newArrivalView(db, "programVendorViews", viewId,
              (tx) => functionsProgramArrivalViews()
                .readProgramVendorView(db, tx, programId, id));
            if (view) entries.push({targetId: viewId, data: view});
          }
          return entries;
        },
      },
    ],
  },
  {
    name: "program-trip-views",
    description:
      "Trips and the hotel desk's inbound read programTripViews and " +
      "programHotelInboundViews through listeners (#1339) instead of the " +
      "listProgramTrips and getProgramHotelInbound callables. Every trip and " +
      "every expected or ready inbound journey to a hotel without a view " +
      "gets one, with only the fields the callables returned (a trip's " +
      "notes, rate, driver and account ids stay in the source) and never a " +
      "phone number. Views the triggers have already written are left " +
      "alone; trips and journeys are never changed. Run " +
      "program-access-views-refresh first, so access views carry their trip " +
      "routes. Build Functions first.",
    steps: [
      {
        source: "transportTrips",
        target: "programTripViews",
        skipReason: "no programme, or already viewed",
        targetId: (id) => validId(id) ? id : null,
        transform: (data, id, db) => newTripView(db, "programTripViews", id,
          (tx) => functionsProgramTripViews().readProgramTripView(db, tx, id)),
      },
      {
        source: "programTravelLegs",
        target: "programHotelInboundViews",
        skipReason: "not an expected or ready inbound journey to a hotel, or already viewed",
        targetId: (id, data) => validId(id) && data.kind === "inbound" ? id : null,
        transform: (data, id, db) => newTripView(db, "programHotelInboundViews", id,
          (tx) => functionsProgramTripViews()
            .readProgramHotelInboundView(db, tx, id)),
      },
    ],
  },
  {
    name: "program-staff-views",
    description:
      "The administrators' staff list reads programStaffViews through a " +
      "listener (#1339) instead of the listProgramStaff callable. Every " +
      "staff grant without a row gets one, with the callable's member fields " +
      "and the facts its status derives from (revoked, owner approval, when " +
      "the live duties start and end). Rows the triggers have already " +
      "written are left alone; grants and programmes are never changed. " +
      "Build Functions first.",
    steps: [
      {
        source: "programStaffGrants",
        target: "programStaffViews",
        skipReason: "not a grant of an existing programme, or already viewed",
        targetId: (id, data) => validId(data.programId) && validId(data.uid) &&
          id === `${data.programId}__${data.uid}` ? id : null,
        transform: (data, id, db) => newStaffView(db, data.programId, data.uid),
      },
    ],
  },
  {
    name: "program-whatsapp-thread-views",
    description:
      "The programme inbox reads programWhatsappThreadViews through a " +
      "listener (#1339) instead of the listProgramWhatsappThreads callable. " +
      "Every programWhatsappThreads document whose programme exists without " +
      "a view gets one, with the row the callable returned (no clock-dependent " +
      "window flag) and the household's label, contact name and guest count, " +
      "as the new triggers write it. The phone hash, sender connection and " +
      "take-over uid stay in the thread. Existing views are never replaced; " +
      "threads, messages and households are never changed. Build Functions " +
      "first.",
    steps: [
      {
        source: "programWhatsappThreads",
        target: "programWhatsappThreadViews",
        skipReason: "no programme or organizer, or already viewed",
        targetId: (id) => validId(id) ? id : null,
        transform: (data, id, db) => newTripView(db, "programWhatsappThreadViews", id,
          (tx) => functionsProgramWhatsappThreadViews()
            .readProgramWhatsappThreadView(db, tx, id)),
      },
    ],
  },
  {
    name: "program-whatsapp-author-labels",
    description:
      "The programme inbox shows who wrote each planner reply without " +
      "reading the staff list (#1339), so each reply writes its author's " +
      "display name beside the message. Every planner reply written before " +
      "that gets authorLabel from its author's staff grant. Replies whose " +
      "author has no grant or no name (the owner) are left as they are, and " +
      "so is every field a message already holds; guest and assistant " +
      "messages are never touched.",
    steps: [
      {
        kind: "fill",
        collection: "programWhatsappMessages",
        fill: async (data, id, db) => {
          if (data.direction !== "outbound" || data.author !== "planner") return null;
          if (!validId(data.programId) || !validId(data.authorUid)) return null;
          if (typeof data.authorLabel === "string" && data.authorLabel) return null;
          const grant = (await db.collection("programStaffGrants")
            .doc(`${data.programId}__${data.authorUid}`).get()).data();
          const name = typeof grant?.displayName === "string" ? grant.displayName.trim() : "";
          return grant?.programId === data.programId && name ?
            {authorLabel: name.slice(0, 120)} : null;
        },
      },
    ],
  },
  {
    name: "organizer-program-views",
    description:
      "The planner's programme list and setup read organizerProgramViews " +
      "through listeners (#1339) instead of the listOrganizerPrograms and " +
      "getOrganizerProgram callables. Every programme without a view gets " +
      "one, with the programme object, its creator, the function count and " +
      "the function, pickup point and hotel setup lists, as the new " +
      "triggers write it. The sender connection, entitlement and request " +
      "hash never appear. Existing views are never replaced; programmes and " +
      "their setup documents are never changed. Build Functions first.",
    steps: [
      {
        source: "organizerPrograms",
        target: "organizerProgramViews",
        skipReason: "no organizer or creator, or already viewed",
        targetId: (id) => validId(id) ? id : null,
        transform: (data, id, db) => newTripView(db, "organizerProgramViews", id,
          (tx) => functionsOrganizerProgramViews()
            .readOrganizerProgramView(db, tx, id)),
      },
    ],
  },
  {
    name: "host-whatsapp-thread-views",
    description:
      "The Host inbox reads hostWhatsappThreadViews through a listener " +
      "(#1339) instead of the listOrganizerWhatsappThreads callable. Every " +
      "retained organizerWhatsappThreads document without a view gets one, " +
      "with the summary the callable returns, as the new triggers write it. " +
      "Threads whose retention has passed get none. Existing views are never " +
      "replaced; threads, messages and contacts are never changed. Build " +
      "Functions first.",
    steps: [
      {
        source: "organizerWhatsappThreads",
        target: "hostWhatsappThreadViews",
        skipReason: "no owner or contact, or its retention has passed",
        targetId: (id) => validId(id) ? id : null,
        transform: (data, id, db) => whatsappThreadViewRow(db, id),
      },
    ],
  },
  {
    name: "host-send-summaries",
    description:
      "Host Sends history and the automation message picker read " +
      "hostSendSummaries through listeners (#1339) instead of the " +
      "listOrganizerCampaigns callable. Every campaign, announcement summary " +
      "and organizer follower post without a row gets one, with the row the " +
      "callable returns, as the new triggers write it. A follower update's " +
      "WhatsApp leg campaign gets none. Existing rows are never replaced; " +
      "campaigns, summaries, posts, delivery operations, templates and saved " +
      "audiences are never changed. Build Functions first.",
    steps: [
      {
        source: "organizerCampaigns",
        target: "hostSendSummaries",
        skipReason: "no owner, or a follower update's WhatsApp leg",
        targetId: (id) => validId(id) ? `campaign_${id}` : null,
        transform: (data, id, db) => sendSummaryRow(db,
          {kind: "campaign", campaignId: id}),
      },
      {
        source: "organizerBroadcastSummaries",
        target: "hostSendSummaries",
        skipReason: "no owner",
        targetId: (id) => validId(id) ? `announcement_${id}` : null,
        transform: (data, id, db) => sendSummaryRow(db,
          {kind: "announcement", broadcastId: id}),
      },
      {
        source: "organizers/*/posts",
        collectionGroup: "posts",
        target: "hostSendSummaries",
        skipReason: "not an organizer post",
        targetId: (id, data, db, ref) => validId(id) && organizerPostOwner(ref) ?
          `followerUpdate_${id}` : null,
        transform: (data, id, db, ref) => sendSummaryRow(db,
          {kind: "followerUpdate", organizerId: organizerPostOwner(ref), postId: id}),
      },
    ],
  },
  {
    name: "host-organizer-bill-views",
    description:
      "The Host Organiser tab and Payments screen read the owner's bills " +
      "from hostOrganizerBillViews through a listener instead of the " +
      "listOrganizerBills callable. Every sent or closed organizerBills " +
      "document without a view gets one, with the row the callable returns, " +
      "as the new trigger writes it. Bills still waiting to be sent get " +
      "none. Existing views are never replaced and bills are never changed. " +
      "Build Functions first.",
    steps: [
      {
        source: "organizerBills",
        target: "hostOrganizerBillViews",
        skipReason: "not sent yet, or no organizer",
        targetId: (id) => validId(id) ? id : null,
        transform: (data, id) =>
          functionsOrganizerScreenViews().bills.organizerBillView(id, data),
      },
    ],
  },
  {
    name: "host-organizer-journey-views",
    description:
      "The Host 'Your page so far' sheet and the waiting-claim notice read " +
      "hostOrganizerJourneyViews through listeners instead of the " +
      "listMyOrganizerJourneys callable. Every organizer gets one view per " +
      "current manager and per person whose claim on it is still being " +
      "checked, with the journey the callable returns to that person, as the " +
      "new triggers write it. Organizers with neither get none. Existing " +
      "views are never replaced; organizers, claims, intake requests, events " +
      "and growth facts are never changed. Build Functions first.",
    steps: [
      {
        source: "organizers",
        target: "hostOrganizerJourneyViews",
        skipReason: "no manager and no waiting claim",
        expand: (data, id, db) => validId(id) ?
          organizerJourneyViewRows(db, id) : [],
      },
    ],
  },
  {
    name: "host-form-automation-views",
    description:
      "Host automations and the rule editor read hostFormAutomationRuleViews " +
      "and hostFormAutomationRunViews through listeners (#1339) instead of " +
      "the listOrganizerFormAutomationRuns callable. Every automation rule " +
      "and run without a view gets one, with the row the callable returns " +
      "and, for a run, its rule's name, as the new triggers write it. " +
      "Webhook secrets and run leases never appear. Existing views are never " +
      "replaced; rules and runs are never changed. Build Functions first.",
    steps: [
      {
        source: "organizerFormAutomationRules",
        target: "hostFormAutomationRuleViews",
        skipReason: "no owner",
        targetId: (id, data) => validId(id) && validId(data.organizerId) ? id : null,
        transform: (data, id, db) => formOperationViewRow(db,
          functionsFormOperationViews().automations.readHostFormAutomationRuleView, id),
      },
      {
        source: "organizerFormAutomationRuns",
        target: "hostFormAutomationRunViews",
        skipReason: "no owner or rule",
        targetId: (id, data) => validId(id) && validId(data.organizerId) &&
          validId(data.ruleId) ? id : null,
        transform: (data, id, db) => formOperationViewRow(db,
          functionsFormOperationViews().automations.readHostFormAutomationRunView, id),
      },
    ],
  },
  {
    name: "host-form-payment-views",
    description:
      "The Host form payments section reads hostFormPaymentViews through a " +
      "listener (#1339) instead of the listOrganizerFormPayments callable. " +
      "Every guestPayments document whose purpose is form gets a view, with " +
      "the ledger row the callable returns, as the new trigger writes it. " +
      "Other checkouts get none, and answers, respondent identity and the " +
      "payment connection never appear. Existing views are never replaced; " +
      "payments are never changed. Build Functions first.",
    steps: [
      {
        source: "guestPayments",
        target: "hostFormPaymentViews",
        skipReason: "not a form fee, or no organizer or form",
        targetId: (id, data) => data.purpose === "form" && validId(id) &&
          validId(data.organizerId) && validId(data.formId) ? id : null,
        transform: (data, id, db) => formOperationViewRow(db,
          functionsFormOperationViews().payments.readHostFormPaymentView, id),
      },
    ],
  },
  {
    name: "program-hotel-room-views",
    description:
      "The hotel desk and the planner's rooms read programHotelRoomViews " +
      "through listeners (#1339) instead of the getProgramHotelRooms " +
      "callable. Every programme hotel without a board gets one: the room " +
      "blocks with their occupancy, the stays with guest names and the " +
      "revisions upsertProgramStay fences on, and the routed guests still " +
      "needing a room, as the new triggers write it, never a contact field " +
      "or note. Existing boards are never replaced; hotels, blocks, stays, " +
      "journeys and guests are never changed. Build Functions first.",
    steps: [
      {
        source: "programHotels",
        target: "programHotelRoomViews",
        skipReason: "not a hotel of an existing programme, or already viewed",
        targetId: (id, data) => validId(id) && validId(data.programId) ?
          `${data.programId}__${id}` : null,
        transform: (data, id, db) => newTripView(db, "programHotelRoomViews",
          `${data.programId}__${id}`, (tx) => roomViews()
            .readProgramHotelRoomView(db, tx, data.programId, id)),
      },
    ],
  },
  {
    name: "host-assignment-views",
    description:
      "The staff work list reads hostAssignmentViews through a listener " +
      "(#1339) instead of the listMyHostAssignments callable. Every " +
      "programme staff grant, event staff grant and organiser team " +
      "membership without a row gets one for its account: the title, the " +
      "organiser's name and the duties with their own expiries (expired " +
      "duties left out), as the new triggers write it. Existing rows are " +
      "never replaced; grants, memberships, programmes, events and " +
      "organisers are never changed. Build Functions first.",
    steps: [
      {
        source: "programStaffGrants",
        target: "hostAssignmentViews",
        skipReason: "not a grant of one account and programme, or already viewed",
        targetId: (id, data) => validId(data.programId) && validId(data.uid) &&
          id === `${data.programId}__${data.uid}` ?
          `${data.uid}__program_${data.programId}` : null,
        transform: (data, id, db) => newTripView(db, "hostAssignmentViews",
          `${data.uid}__program_${data.programId}`, (tx) => assignmentViews()
            .readProgramAssignmentView(db, tx, data.uid, data.programId,
              hostAssignmentNowMillis)),
      },
      {
        source: "eventStaffGrants",
        target: "hostAssignmentViews",
        skipReason: "not a grant of one account and event, or already viewed",
        targetId: (id, data) => validId(data.eventId) && validId(data.uid) ?
          `${data.uid}__event_${data.eventId}` : null,
        transform: (data, id, db) => newTripView(db, "hostAssignmentViews",
          `${data.uid}__event_${data.eventId}`, async (tx) => (await
          assignmentViews().readEventAssignmentView(db, tx, id)).view),
      },
      {
        source: "organizerTeamMemberships",
        target: "hostAssignmentViews",
        skipReason: "not an active membership, or already viewed",
        targetId: (id, data) => validId(data.organizerId) && validId(data.uid) &&
          data.status === "active" ?
          `${data.uid}__team_${data.organizerId}` : null,
        transform: (data, id, db) => newTripView(db, "hostAssignmentViews",
          `${data.uid}__team_${data.organizerId}`, async (tx) => (await
          assignmentViews().readTeamAssignmentView(db, tx, id)).view),
      },
    ],
  },
  {
    name: "organizer-moment-views",
    description:
      "The event Moments screen and the programme's planned messages read " +
      "organizerMomentViews through listeners (#1339) instead of the " +
      "listOrganizerMoments callable. Every event and programme moment " +
      "without a row gets one: the moment as the callable returned it and " +
      "its sent count and next planned run from organizerMomentRuns. " +
      "Organiser-scope automation moments get none, and the sender " +
      "connection stays on the callable. Existing rows are never replaced; " +
      "moments and runs are never changed. Build Functions first.",
    steps: [
      {
        source: "organizerMoments",
        target: "organizerMomentViews",
        skipReason: "an organiser-scope or unreadable moment, or already viewed",
        targetId: (id, data) => validId(id) &&
          (data.scopeKind === "event" || data.scopeKind === "program") ?
          id : null,
        transform: (data, id, db) => newTripView(db, "organizerMomentViews",
          id, (tx) => momentViews().readOrganizerMomentView(db, tx, id)),
      },
    ],
  },
  {
    name: "program-guest-directory-views",
    description:
      "The Host app's guest list, guest desk and programme inbox audience " +
      "read programGuestDirectoryViews through Firestore (#2306) instead of " +
      "the listProgramGuests callable. Every guest, household and guest " +
      "group without a row gets one: a guest's fields with its name, phone " +
      "and email resolved from the workspace field assertions as the " +
      "callable resolves them, and its function rows; a household's label, " +
      "members and revision; a group's label, dimension, order, member " +
      "count and revision. A guest whose name is not disclosable gets none. " +
      "Then every programAccessViews view that differs from what the " +
      "triggers would compute now is rewritten under a last-update-time " +
      "precondition, which adds programAll, the whole-programme duty the " +
      "directory rules read. Existing rows are never replaced; guests, " +
      "households, groups, programmes and grants are never changed. Build " +
      "Functions first.",
    steps: [
      guestDirectoryStep("programGuests", "guest"),
      guestDirectoryStep("programHouseholds", "household"),
      guestDirectoryStep("programGuestGroups", "group"),
      {
        kind: "fill",
        collection: "programAccessViews",
        refresh: programAccessViewFields,
        fill: async (data, id, db) => {
          if (!validId(data.programId) || typeof data.uid !== "string" ||
              !validId(data.uid)) return null;
          return programAccessViewRow(db, data.programId, data.uid);
        },
      },
    ],
  },
  {
    name: "program-setting-views",
    description:
      "The programme inbox header, the planned-message sender and the " +
      "assistant settings read programSenderViews and " +
      "programAssistantSettingViews through listeners (#2306) instead of the " +
      "sender reads of listProgramWhatsappThreads and listOrganizerMoments " +
      "and the getProgramAssistantSettings callable. Every programme without " +
      "views gets them: its display-safe sender (the bound connection, else " +
      "the organiser's first active WhatsApp sender, and that first active " +
      "sender's id), never provider ids, the secret reference or test " +
      "evidence; and its assistant settings (the stored ones, else the " +
      "defaults) with each active escalation grant's expiry. Existing views " +
      "are never replaced; programmes, connections, settings and grants are " +
      "never changed. Build Functions first.",
    steps: [
      {
        source: "organizerPrograms",
        target: "programSenderViews",
        skipReason: "no organizer, or already viewed",
        targetId: (id) => validId(id) ? id : null,
        transform: (data, id, db) => newView(db, "programSenderViews", id,
          (tx) => settingViews().readProgramSenderView(db, tx, id)),
      },
      {
        source: "organizerPrograms",
        target: "programAssistantSettingViews",
        skipReason: "no organizer, or already viewed",
        targetId: (id) => validId(id) ? id : null,
        transform: (data, id, db) => newView(db,
          "programAssistantSettingViews", id,
          (tx) => settingViews().readProgramAssistantSettingView(db, tx, id)),
      },
    ],
  },
  {
    name: "host-organizer-account-views",
    description:
      "The Host app's billing status and plan grants and the website's " +
      "billing portal and owner page read hostOrganizerBillingViews, " +
      "hostOrganizerEntitlementViews and hostOrganizerOwnerViews through " +
      "Firestore (#2306) instead of the getOrganizerBillingStatus, " +
      "getOrganizerEntitlement and getOrganizerOwnerView callables. Every " +
      "organizer without them gets a billing view (the trial's facts and " +
      "the plan status, no prices) and an owner view (its owner, page " +
      "fields, 40 days of insights, follower allowance and WhatsApp " +
      "readiness), and every entitlements document an entitlement view " +
      "(grants with validity windows, never the admin note, receipt or " +
      "granter). Existing views are never replaced; sources are never " +
      "changed. Build Functions first.",
    steps: [
      {
        source: "organizers",
        target: "hostOrganizerBillingViews",
        skipReason: "already viewed",
        targetId: (id) => validId(id) ? id : null,
        transform: (data, id, db) => newView(db, "hostOrganizerBillingViews",
          id, (tx) => accountViews().account.readOrganizerBillingView(db, tx,
            id)),
      },
      {
        source: "organizerEntitlements",
        target: "hostOrganizerEntitlementViews",
        skipReason: "an invalid entitlements document, or already viewed",
        targetId: (id) => validId(id) ? id : null,
        transform: (data, id, db) => newView(db,
          "hostOrganizerEntitlementViews", id, (tx) => accountViews().account
            .readOrganizerEntitlementView(db, tx, id)),
      },
      {
        source: "organizers",
        target: "hostOrganizerOwnerViews",
        skipReason: "already viewed",
        targetId: (id) => validId(id) ? id : null,
        transform: (data, id, db) => newView(db, "hostOrganizerOwnerViews",
          id, (tx) => accountViews().owner.readOrganizerOwnerView(db, tx, id,
            organizerAccountNow)),
      },
    ],
  },
  {
    name: "host-form-views",
    description:
      "The Host form editor and form analytics read hostFormEditorViews, " +
      "hostFormAnalyticsViews and hostFormSourceViews (#2306) instead of " +
      "the getOrganizerFormEditor and getOrganizerFormAnalytics callables. " +
      "Every form with a draft gets its editor view (summary, draft " +
      "definition and validation issues), every published version its " +
      "analytics view (funnel and question aggregates, with the privacy " +
      "threshold applied) and every form with share links its funnel view " +
      "(labels and counters, never a token). Existing views are never " +
      "replaced; forms, drafts, versions, aggregates and links are never " +
      "changed. Build Functions first.",
    steps: [
      {
        source: "organizerForms",
        target: "hostFormEditorViews",
        skipReason: "no draft, a draft of another organizer, or already viewed",
        targetId: (id) => validId(id) ? id : null,
        transform: (data, id, db) => newView(db, "hostFormEditorViews", id,
          (tx) => formViews().readFormEditorView(db, tx, id)),
      },
      {
        source: "organizerFormVersions",
        target: "hostFormAnalyticsViews",
        skipReason: "already viewed",
        targetId: (id) => validId(id) ? id : null,
        transform: (data, id, db) => newView(db, "hostFormAnalyticsViews", id,
          (tx) => formViews().readFormAnalyticsView(db, tx, id)),
      },
      {
        source: "organizerForms",
        target: "hostFormSourceViews",
        skipReason: "no share links, or already viewed",
        targetId: (id) => validId(id) ? id : null,
        transform: (data, id, db) => newView(db, "hostFormSourceViews", id,
          (tx) => formViews().readFormSourceView(db, tx, id)),
      },
    ],
  },
  {
    name: "host-crm-views",
    description:
      "Host form automations read hostAudienceSourceViews instead of the " +
      "filterOptions of listOrganizerSavedAudiences, and the People " +
      "duplicate review reads hostContactMergeCandidateViews instead of " +
      "listOrganizerContactMergeCandidates (#2306). Every organizer gets its " +
      "audience sources (form titles, filterable questions, event names and " +
      "tag labels), and every pair a conflicted claim or a proposed phone or " +
      "email link joins gets its candidate view (names, phones, emails, " +
      "evidence and decision; never identity hashes or linked uids). " +
      "Existing views are never replaced; sources are never changed. Build " +
      "Functions first.",
    steps: [
      {
        source: "organizers",
        target: "hostAudienceSourceViews",
        skipReason: "already viewed",
        targetId: (id) => validId(id) ? id : null,
        transform: (data, id, db) => newView(db, "hostAudienceSourceViews", id,
          (tx) => crmViews().sources.readAudienceSourceView(db, tx, id)),
      },
      {
        source: "organizerContacts",
        target: "hostContactMergeCandidateViews",
        skipReason: "no candidate pair starts at this contact, or already viewed",
        expand: (data, id, db) => contactCandidateViews(db, data, id),
      },
    ],
  },
  {
    name: "guest-roster-links",
    description:
      "The Catch app's event message preferences read the guest's own " +
      "guestEventStatuses.rosterLink instead of " +
      "getEventAssistanceParticipantContext (#2306). Every guest status row " +
      "gets its roster link (the guest's own linked attendee id, ambiguous, " +
      "or null), and a guest linked to a roster row with no status row yet " +
      "gets one. Only rosterLink is written on existing rows, with a " +
      "last-update-time precondition. Build Functions first.",
    steps: [
      {
        kind: "fill",
        collection: "guestEventStatuses",
        refresh: ["rosterLink"],
        fill: async (data, id, db) => {
          // The row's id names its guest; a row whose fields disagree with
          // its id is left for the trigger to rebuild.
          if (!validId(data.eventId) || !validId(data.uid) ||
              id !== `${data.eventId}_${data.uid}`) return null;
          const event = await db.collection("events").doc(data.eventId).get();
          return {rosterLink: guestEventStatuses().guestRosterLink(
            event.data()?.status, await linkedAttendeeIds(db, data.eventId, data.uid))};
        },
      },
      {
        source: "eventAttendees",
        target: "guestEventStatuses",
        skipReason: "no linked guest, a second row of the same guest, or a row already",
        expand: async (data, id, db) => {
          if (!validId(data.eventId) || !validId(data.linkedUid)) return [];
          const ids = await linkedAttendeeIds(db, data.eventId, data.linkedUid);
          if (ids[0] !== id) return [];
          const targetId = `${data.eventId}_${data.linkedUid}`;
          const row = await newView(db, "guestEventStatuses", targetId,
            (tx) => guestEventStatuses().guestEventStatus({db, tx,
              eventId: data.eventId, uid: data.linkedUid, nowMillis: Date.now()}));
          return row ? [{targetId, data: row}] : [];
        },
      },
    ],
  },
];

/**
 * A host-lead id in the joinWaitlist receipt shape (host_lead_<ms>_<uuid>),
 * stable per waitlist entry: the entry's creation time and a uuid-formatted
 * digest of its id.
 */
export function preReceiptHostLeadId(id, data) {
  const created = typeof data.createdAt?.toMillis === "function" ?
    data.createdAt.toMillis() : 1_700_000_000_000;
  const hex = crypto.createHash("sha256").update(`launchWaitlist/${id}`).digest("hex");
  const uuid = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-` +
    `${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
  return `host_lead_${String(created).padStart(13, "0")}_${uuid}`;
}

/** The cohort split Functions used to infer from gender counts at read time. */
function cohortCountsFromGenderCounts(genderCounts) {
  const counts = genderCounts ?? {};
  const nonBinaryOrOther = (counts.nonBinary ?? 0) + (counts.other ?? 0);
  return {
    ...(counts.man ? {menInterestedInWomen: counts.man} : {}),
    ...(counts.woman ? {womenInterestedInMen: counts.woman} : {}),
    ...(nonBinaryOrOther ? {nonBinaryOrOther} : {}),
  };
}

export function migrationsByName(names) {
  if (names.length === 1 && names[0] === "all") return MIGRATIONS;
  return names.map((name) => {
    const migration = MIGRATIONS.find((entry) => entry.name === name);
    if (!migration) {
      throw new Error(
        `Unknown migration "${name}". Known: ${MIGRATIONS.map((m) => m.name).join(", ")}, all.`
      );
    }
    return migration;
  });
}
