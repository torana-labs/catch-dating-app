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
      "Every eventParticipations booking gets one eventAttendees row carrying " +
      "its booking facts, and an eventAttendeeIndex pointer from the account " +
      "to that row. Existing linked rows are filled, never replaced; " +
      "participations stay in place.",
    steps: [
      {
        source: "eventParticipations",
        target: "eventAttendees",
        skipReason: "already has a roster row (filled by the next step)",
        targetId: async (id, data, db) => {
          if (typeof data.eventId !== "string" || typeof data.uid !== "string") return null;
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
        collection: "eventAttendees",
        fill: async (data, id, db) => {
          if (data.booking || typeof data.linkedUid !== "string") return null;
          const booking = await db.collection("eventParticipations")
            .doc(`${data.eventId}_${data.linkedUid}`).get();
          if (!booking.exists) return null;
          const {projection, admin} = functionsRoster();
          return {booking: projection.catchBookingFacts(booking.data(), true,
            admin.firestore.Timestamp.now())};
        },
      },
      {
        source: "eventParticipations",
        target: "eventAttendeeIndex",
        skipReason: "more than one roster row is linked to this account",
        targetId: async (id, data, db) => {
          if (typeof data.eventId !== "string" || typeof data.uid !== "string") return null;
          const linked = await linkedAttendeeId(db, data.eventId, data.uid);
          return linked.ambiguous ? null : `${data.eventId}_${data.uid}`;
        },
        transform: async (data, id, db) => {
          const linked = await linkedAttendeeId(db, data.eventId, data.uid);
          return {eventId: data.eventId, organizerId: data.organizerId, uid: data.uid,
            attendeeId: linked.id ?? uidAttendeeId(data.eventId, data.uid),
            createdAt: data.createdAt};
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
