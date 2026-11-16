import crypto from "node:crypto";
import fs from "node:fs";
import {createFunctionsRequire} from "../../lib/repo_paths.mjs";

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
