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
    db.collection("eventParticipations").doc(`${eventId}_${uid}`).get(),
    db.collection("eventAttendees").where("eventId", "==", eventId).where("linkedUid", "==", uid).get(),
    db.collection("guestPayments").where("eventId", "==", eventId).where("recipientUid", "==", uid).get(),
    db.collection("organizerApplications").where("targetId", "==", eventId).where("linkedUid", "==", uid).get(),
    db.collection("organizerEventOfferRecipients").where("eventId", "==", eventId).where("recipientUid", "==", uid).get(),
  ]);
  return [
    ...(booking.exists ? [`eventParticipations/${eventId}_${uid}`] : []),
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

/** The organizer that owns an organizers/{organizerId}/posts document. */
function organizerPostOwner(ref) {
  const organizer = ref?.parent?.parent;
  return organizer?.parent?.id === "organizers" && validId(organizer.id) ?
    organizer.id : null;
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
  "workPickup", "workHotel", "workFunction", "assignments",
  "grantExpiresAtMillis", "revision", "version",
];

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
      "Every eventParticipations booking gets one eventAttendees roster row " +
      "and links to it (attendeeId). The booking stays the one record of the " +
      "guest's booking; the row is the Host's view of that guest. Existing " +
      "linked rows are reused, never replaced; nothing is deleted.",
    steps: [
      {
        source: "eventParticipations",
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
        collection: "eventParticipations",
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
        source: "eventParticipations",
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
            db.collection("eventParticipations").doc(`${data.eventId}_${data.linkedUid}`).get(),
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
      guestEventStatusStep("eventParticipations", "eventId", "uid"),
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
      missingGuestEventStatusStep("eventParticipations", "eventId", "uid"),
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
