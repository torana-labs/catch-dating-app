#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {createRequire} from "node:module";
import {fileURLToPath} from "node:url";
import {
  assertNoUserEventScheduleConflictInFirestore,
  buildClubScheduleLockDocs,
  buildUserEventScheduleLockDocs,
} from "../demo/demo_schedule_policy.mjs";
export {
  listScenarioConfigs,
  loadScenarioConfig,
} from "./demo_seed_scenario_catalog.mjs";

const toolDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(toolDir, "../..");
const requireFromFunctions = createRequire(
  path.join(repoRoot, "functions/package.json")
);

export const DEFAULT_DEMO_OPS_PREFIX = "demo_ops_2026";
export const DEFAULT_SEED_PREFIX = "demo_beta_2026";
export const DEMO_MANIFEST_COLLECTION = "demoOpsEvents";
export const SUVBOT_ACCESS_COLLECTION = "demoSelfServiceAccess";
export const DEFAULT_MAX_BATCH_WRITES = 450;
export const DEFAULT_GOLDEN_ACCOUNTS_FILE =
  "tool/demo/demo_seed/golden_accounts.example.json";
const SELF_CHECK_IN_WINDOW_BEFORE_MINUTES = 10;
const SELF_CHECK_IN_WINDOW_AFTER_MINUTES = 30;

const cityLabels = {
  mumbai: "Mumbai",
  delhi: "Delhi",
  bangalore: "Bangalore",
  hyderabad: "Hyderabad",
  chennai: "Chennai",
  kolkata: "Kolkata",
  pune: "Pune",
  ahmedabad: "Ahmedabad",
  indore: "Indore",
};

export function loadFirebaseAdmin() {
  return requireFromFunctions("firebase-admin");
}

export function normalizePhone(raw) {
  const value = String(raw ?? "").replace(/\s+/g, "").trim();
  if (!/^\+[1-9]\d{7,14}$/.test(value)) {
    throw new Error(`Invalid E.164 phone number: ${raw}`);
  }
  return value;
}

export function splitCsv(value) {
  if (!value) return [];
  return String(value).split(",").map((item) => item.trim()).filter(Boolean);
}

export function matchIdFor(uidA, uidB) {
  if (!uidA || !uidB || uidA === uidB) {
    throw new Error("A match requires two distinct user IDs.");
  }
  return [uidA, uidB].sort().join("_");
}

function demoOpsCohortIdForGender(gender) {
  if (gender === "man") return "menInterestedInWomen";
  if (gender === "woman") return "womenInterestedInMen";
  if (gender === "nonBinary" || gender === "other") {
    return "nonBinaryOrOther";
  }
  return "queerOrOpen";
}

export function demoOperationId({command, seedPrefix, subject}) {
  const normalizedSubject = subject.replace(/[^A-Za-z0-9_-]/g, "_");
  return `${seedPrefix}_${command}_${normalizedSubject}`;
}

export function timestampFromDate(admin, date) {
  return admin.firestore.Timestamp.fromDate(date);
}

export function offsetDate(baseDate, {minutes = 0, hours = 0, days = 0} = {}) {
  return new Date(
    baseDate.getTime() +
      minutes * 60 * 1000 +
      hours * 60 * 60 * 1000 +
      days * 24 * 60 * 60 * 1000
  );
}

export function buildDemoMarker({admin, command, operationId, seedPrefix, now}) {
  return {
    demoOps: true,
    demoOpsCommand: command,
    demoOpsId: operationId,
    seedPrefix,
    synthetic: true,
    createdAt: timestampFromDate(admin, now),
  };
}

export async function resolveUserByPhone(db, phone) {
  const normalizedPhone = normalizePhone(phone);
  const snap = await db.collection("users")
    .where("phoneNumber", "==", normalizedPhone)
    .limit(2)
    .get();
  if (snap.empty) {
    throw new Error(`No users document found for phone ${normalizedPhone}.`);
  }
  if (snap.size > 1) {
    throw new Error(`Phone ${normalizedPhone} matched multiple users.`);
  }
  const doc = snap.docs[0];
  return {uid: doc.id, phoneNumber: normalizedPhone, data: doc.data()};
}

export async function requirePublicProfile(db, uid) {
  const doc = await db.collection("publicProfiles").doc(uid).get();
  if (!doc.exists) {
    throw new Error(
      `Missing publicProfiles/${uid}. Complete onboarding or repair profile sync first.`
    );
  }
  return {uid, data: doc.data()};
}

export async function resolveUsersByPhones(db, phones) {
  const users = [];
  for (const phone of phones) {
    const user = await resolveUserByPhone(db, phone);
    await requirePublicProfile(db, user.uid);
    users.push(user);
  }
  return users;
}

export async function findSyntheticTargets(db, {excludeUid, limit = 3}) {
  const usersSnap = await db.collection("users")
    .where("synthetic", "==", true)
    .limit(Math.max(limit * 3, limit))
    .get();
  const targets = [];
  for (const doc of usersSnap.docs) {
    if (doc.id === excludeUid) continue;
    const profile = await db.collection("publicProfiles").doc(doc.id).get();
    if (!profile.exists) continue;
    targets.push({uid: doc.id, data: doc.data(), publicProfile: profile.data()});
    if (targets.length >= limit) break;
  }
  return targets;
}

export function loadGoldenAccounts(filePath = DEFAULT_GOLDEN_ACCOUNTS_FILE) {
  const resolvedPath = path.resolve(repoRoot, filePath);
  const json = JSON.parse(fs.readFileSync(resolvedPath, "utf8"));
  return json.accounts ?? [];
}

export function buildParticipationDoc({
  admin,
  marker,
  uid,
  event,
  status,
  genderAtSignup = "other",
  now,
}) {
  const createdAt = offsetDate(now, {days: status === "attended" ? -10 : -2});
  const attendedAt = status === "attended" && typeof event.data.endTime?.toDate === "function" ?
    event.data.endTime.toDate() :
    null;
  return {
    path: `eventParticipations/${event.id}_${uid}`,
    data: {
      ...marker,
      eventId: event.id,
      clubId: event.data.clubId,
      uid,
      status,
      createdAt: timestampFromDate(admin, createdAt),
      updatedAt: timestampFromDate(admin, now),
      signedUpAt: ["signedUp", "attended"].includes(status) ?
        timestampFromDate(admin, createdAt) :
        null,
      waitlistedAt: status === "waitlisted" ? timestampFromDate(admin, createdAt) : null,
      attendedAt: attendedAt ? timestampFromDate(admin, attendedAt) : null,
      cancelledAt: null,
      deletedAt: null,
      genderAtSignup: typeof genderAtSignup === "string" ? genderAtSignup : "other",
      paymentId: null,
    },
  };
}

async function buildParticipationDocsWithLocks({
  db,
  admin,
  marker,
  uid,
  event,
  status,
  genderAtSignup = "other",
  now,
}) {
  await assertNoUserEventScheduleConflictInFirestore({db, uid, event});
  const participation = buildParticipationDoc({
    admin,
    marker,
    uid,
    event,
    status,
    genderAtSignup,
    now,
  });
  return [
    participation,
    ...buildUserEventScheduleLockDocs({event, participation}),
  ];
}

export async function buildMakeEventFullPlan({
  db,
  admin,
  eventId,
  seedPrefix = DEFAULT_DEMO_OPS_PREFIX,
  now = new Date(),
}) {
  const eventSnap = await db.collection("events").doc(eventId).get();
  if (!eventSnap.exists) throw new Error(`Missing events/${eventId}.`);
  const event = {id: eventSnap.id, path: eventSnap.ref.path, data: eventSnap.data()};
  const existing = await db.collection("eventParticipations")
    .where("eventId", "==", eventId)
    .get();
  const activeCount = existing.docs
    .filter((doc) => ["signedUp", "attended"].includes(doc.data().status))
    .length;
  const capacity = Number(event.data.capacityLimit ?? activeCount);
  const slotsToFill = Math.max(0, capacity - activeCount);
  const targets = await findSyntheticTargets(db, {
    excludeUid: event.data.hostUserId,
    limit: slotsToFill,
  });
  const operationId = demoOperationId({
    command: "make_run_full",
    seedPrefix,
    subject: eventId,
  });
  const marker = buildDemoMarker({
    admin,
    command: "make-event-full",
    operationId,
    seedPrefix,
    now,
  });
  const docs = [];
  for (const target of targets) {
    docs.push(...await buildParticipationDocsWithLocks({
      db,
      admin,
      marker,
      uid: target.uid,
      event,
      status: "signedUp",
      genderAtSignup: target.data.gender,
      now,
    }));
  }
  return {
    command: "make-event-full",
    operationId,
    eventId,
    slotsToFill,
    docs: uniqueDocsByPath(docs),
    aggregateRepairRecommended: true,
  };
}

export async function buildPromoteWaitlistPlan({
  db,
  admin,
  phone,
  eventId,
  seedPrefix = DEFAULT_DEMO_OPS_PREFIX,
  now = new Date(),
}) {
  const user = await resolveUserByPhone(db, phone);
  const eventSnap = await db.collection("events").doc(eventId).get();
  if (!eventSnap.exists) throw new Error(`Missing events/${eventId}.`);
  const operationId = demoOperationId({
    command: "promote_waitlist",
    seedPrefix,
    subject: `${eventId}_${user.uid}`,
  });
  const marker = buildDemoMarker({
    admin,
    command: "promote-waitlist",
    operationId,
    seedPrefix,
    now,
  });
  const event = {id: eventSnap.id, path: eventSnap.ref.path, data: eventSnap.data()};
  const docs = [
    ...await buildParticipationDocsWithLocks({
      db,
      admin,
      marker,
      uid: user.uid,
      event,
      status: "signedUp",
      genderAtSignup: user.data.gender,
      now,
    }),
    {
      path: `notifications/${user.uid}/items/demoOps_waitlistPromotion_${eventId}`,
      data: {
        ...marker,
        uid: user.uid,
        type: "waitlistPromotion",
        title: "You're in",
        body: "A spot opened on your demo event.",
        createdAt: timestampFromDate(admin, now),
        readAt: null,
        matchId: null,
        eventId,
        clubId: event.data.clubId,
        actorUid: null,
        actorName: null,
      },
    },
  ];
  return {
    command: "promote-waitlist",
    operationId,
    phone: user.phoneNumber,
    uid: user.uid,
    eventId,
    docs,
    aggregateRepairRecommended: true,
  };
}

export async function buildUnreadMessagePlan({
  db,
  admin,
  fromPhone,
  toPhone,
  text = "Can you check this demo chat?",
  seedPrefix = DEFAULT_DEMO_OPS_PREFIX,
  now = new Date(),
}) {
  const [fromUser, toUser] = await resolveUsersByPhones(db, [fromPhone, toPhone]);
  const matchId = matchIdFor(fromUser.uid, toUser.uid);
  const matchSnap = await db.collection("matches").doc(matchId).get();
  if (!matchSnap.exists) {
    throw new Error(`Missing matches/${matchId}. Event match-phones first.`);
  }
  const operationId = demoOperationId({
    command: "unread_message",
    seedPrefix,
    subject: `${matchId}_${now.getTime()}`,
  });
  const marker = buildDemoMarker({
    admin,
    command: "create-unread-message",
    operationId,
    seedPrefix,
    now,
  });
  return {
    command: "create-unread-message",
    operationId,
    matchId,
    phones: [fromUser.phoneNumber, toUser.phoneNumber],
    users: [fromUser.uid, toUser.uid],
    docs: [{
      path: `matches/${matchId}/messages/${operationId}_msg_01`,
      data: {
        ...marker,
        senderId: fromUser.uid,
        text,
        imageUrl: null,
        sentAt: timestampFromDate(admin, now),
      },
    }],
    triggerExpected: "onMessageCreated updates unreadCounts and notifications.",
  };
}

export async function buildRefundPlan({
  db,
  admin,
  phone,
  eventId,
  seedPrefix = DEFAULT_DEMO_OPS_PREFIX,
  now = new Date(),
}) {
  const user = await resolveUserByPhone(db, phone);
  const eventSnap = await db.collection("events").doc(eventId).get();
  if (!eventSnap.exists) throw new Error(`Missing events/${eventId}.`);
  const amount = Number(eventSnap.data().priceInPaise ?? 29900) || 29900;
  const operationId = demoOperationId({
    command: "refund",
    seedPrefix,
    subject: `${eventId}_${user.uid}`,
  });
  const marker = buildDemoMarker({
    admin,
    command: "create-refund",
    operationId,
    seedPrefix,
    now,
  });
  const paymentId = `${seedPrefix}_refund_${eventId}_${user.uid}`;
  return {
    command: "create-refund",
    operationId,
    phone: user.phoneNumber,
    uid: user.uid,
    eventId,
    docs: [{
      path: `payments/${paymentId}`,
      data: {
        ...marker,
        userId: user.uid,
        orderId: `${seedPrefix}_refund_order_${eventId}_${user.uid}`,
        paymentId,
        eventId,
        amount,
        currency: "INR",
        status: "refunded",
        signUpFailed: false,
        createdAt: timestampFromDate(admin, offsetDate(now, {days: -1})),
      },
    }],
  };
}

export async function buildHostAccountPlan({
  db,
  admin,
  phone,
  seedPrefix = DEFAULT_DEMO_OPS_PREFIX,
  latitude,
  longitude,
  meetingPoint,
  now = new Date(),
}) {
  const user = await resolveUserByPhone(db, phone);
  const profile = await requirePublicProfile(db, user.uid);
  const operationId = demoOperationId({
    command: "host_account",
    seedPrefix,
    subject: user.uid,
  });
  const marker = buildDemoMarker({
    admin,
    command: "create-host-account",
    operationId,
    seedPrefix,
    now,
  });
  const clubId = `${seedPrefix}_host_club_${user.uid}`;
  const eventId = `${seedPrefix}_host_run_${user.uid}_01`;
  const city = user.data.city ?? "mumbai";
  const hostName = publicName(profile.data, user.data);
  const hostAvatarUrl = firstPhoto(profile.data);
  const eventLocation = requireExactEventLocation({
    latitude: latitude ?? user.data.latitude,
    longitude: longitude ?? user.data.longitude,
    meetingPoint: meetingPoint ?? `${cityLabel(city)} main gate`,
    notes: "Demo host event created by demo ops.",
    command: "create-host-account",
  });
  const docs = [
    {
      path: `clubHostClaims/${user.uid}`,
      data: {
        ...marker,
        uid: user.uid,
        clubId: clubId,
        createdAt: timestampFromDate(admin, now),
      },
    },
    {
      path: `clubs/${clubId}`,
      data: {
        ...marker,
        name: `${hostName} Club`,
        description: "Demo host-owned club for investor and beta walkthroughs.",
        location: city,
        area: cityLabel(city),
        hostUserId: user.uid,
        hostName,
        hostAvatarUrl,
        ownerUserId: user.uid,
        hostUserIds: [user.uid],
        hostProfiles: [{
          uid: user.uid,
          displayName: hostName,
          avatarUrl: hostAvatarUrl,
          role: "owner",
        }],
        createdAt: timestampFromDate(admin, now),
        imageUrl: null,
        profileImageUrl: null,
        tags: ["Demo", "Host tools"],
        memberCount: 1,
        rating: 0,
        reviewCount: 0,
        nextEventAt: timestampFromDate(admin, offsetDate(now, {days: 2})),
        nextEventLabel: `${cityLabel(city)} main gate`,
        instagramHandle: null,
        phoneNumber: user.phoneNumber,
        email: user.data.email ?? null,
        status: "active",
        archived: false,
        archivedAt: null,
        archiveReason: null,
      },
    },
    {
      path: `clubMemberships/${clubId}_${user.uid}`,
      data: {
        ...marker,
        clubId,
        uid: user.uid,
        role: "owner",
        status: "active",
        pushNotificationsEnabled: true,
        joinedAt: timestampFromDate(admin, now),
        leftAt: null,
        deletedAt: null,
      },
    },
    {
      path: `events/${eventId}`,
      data: {
        ...marker,
        clubId: clubId,
        startTime: timestampFromDate(admin, offsetDate(now, {days: 2})),
        endTime: timestampFromDate(admin, offsetDate(now, {days: 2, hours: 1})),
        meetingPoint: eventLocation.name,
        meetingLocation: eventLocation,
        startingPointLat: eventLocation.latitude,
        startingPointLng: eventLocation.longitude,
        locationDetails: eventLocation.notes,
        distanceKm: 5,
        pace: "easy",
        capacityLimit: 12,
        description: "Host tools demo event with editable roster and attendance state.",
        priceInPaise: 0,
        bookedCount: 0,
        checkedInCount: 0,
        waitlistedCount: 0,
        status: "active",
        cancelledAt: null,
        cancellationReason: null,
        constraints: {minAge: 21, maxAge: 45, maxMen: null, maxWomen: null},
        genderCounts: {},
        cohortCounts: {},
        waitlistedCohortCounts: {},
      },
    },
  ];
  docs.push(...buildClubScheduleLockDocs({
    event: {
      id: eventId,
      data: docs.find((doc) => doc.path === `events/${eventId}`).data,
    },
  }));
  return {
    command: "create-host-account",
    operationId,
    phone: user.phoneNumber,
    uid: user.uid,
    eventId,
    clubId: clubId,
    docs,
    aggregateRepairRecommended: true,
  };
}

export async function buildCheckInEventPlan({
  db,
  admin,
  phone,
  seedPrefix = DEFAULT_DEMO_OPS_PREFIX,
  latitude,
  longitude,
  meetingPoint = "Check-in test point",
  now = new Date(),
}) {
  const user = await resolveUserByPhone(db, phone);
  const profile = await requirePublicProfile(db, user.uid);
  const eventLocation = requireExactEventLocation({
    latitude: latitude ?? user.data.latitude,
    longitude: longitude ?? user.data.longitude,
    meetingPoint,
    notes: "Demo check-in event. The check-in window is already open.",
    command: "create-check-in-event",
  });
  const lat = eventLocation.latitude;
  const lng = eventLocation.longitude;

  const operationId = demoOperationId({
    command: "check_in_run",
    seedPrefix,
    subject: user.uid,
  });
  const marker = buildDemoMarker({
    admin,
    command: "create-check-in-event",
    operationId,
    seedPrefix,
    now,
  });
  const city = user.data.city ?? "mumbai";
  const name = publicName(profile.data, user.data);
  const hostAvatarUrl = firstPhoto(profile.data);
  const clubId = `${seedPrefix}_checkin_club_${user.uid}`;
  const eventId = `${seedPrefix}_checkin_run_${user.uid}`;
  const startTime = offsetDate(now, {minutes: 5});
  const endTime = offsetDate(now, {minutes: 50});
  const event = {
    id: eventId,
    path: `events/${eventId}`,
    data: {
      ...marker,
      clubId: clubId,
      startTime: timestampFromDate(admin, startTime),
      endTime: timestampFromDate(admin, endTime),
      meetingPoint: eventLocation.name,
      meetingLocation: eventLocation,
      startingPointLat: lat,
      startingPointLng: lng,
      locationDetails: eventLocation.notes,
      distanceKm: 5,
      pace: "easy",
      capacityLimit: 12,
      description: "Short-lived demo event for testing location-gated self check-in.",
      priceInPaise: 0,
      bookedCount: 1,
      checkedInCount: 0,
      waitlistedCount: 0,
      status: "active",
      cancelledAt: null,
      cancellationReason: null,
      constraints: {minAge: 18, maxAge: 70, maxMen: null, maxWomen: null},
      genderCounts: {[user.data.gender ?? "other"]: 1},
      cohortCounts: {
        [demoOpsCohortIdForGender(user.data.gender ?? "other")]: 1,
      },
      waitlistedCohortCounts: {},
    },
  };
  const docs = [
    {
      path: `clubHostClaims/${user.uid}`,
      data: {
        ...marker,
        uid: user.uid,
        clubId: clubId,
        createdAt: timestampFromDate(admin, now),
      },
    },
    {
      path: `clubs/${clubId}`,
      data: {
        ...marker,
        name: `${name} Check-In Club`,
        description: "Demo club for testing location-gated check-in.",
        location: city,
        area: cityLabel(city),
        hostUserId: user.uid,
        hostName: name,
        hostAvatarUrl,
        ownerUserId: user.uid,
        hostUserIds: [user.uid],
        hostProfiles: [{
          uid: user.uid,
          displayName: name,
          avatarUrl: hostAvatarUrl,
          role: "owner",
        }],
        createdAt: timestampFromDate(admin, now),
        imageUrl: null,
        profileImageUrl: null,
        tags: ["Demo", "Check-in"],
        memberCount: 1,
        rating: 0,
        reviewCount: 0,
        nextEventAt: timestampFromDate(admin, startTime),
        nextEventLabel: meetingPoint,
        instagramHandle: null,
        phoneNumber: user.phoneNumber,
        email: user.data.email ?? null,
        status: "active",
        archived: false,
        archivedAt: null,
        archiveReason: null,
      },
    },
    {
      path: `clubMemberships/${clubId}_${user.uid}`,
      data: {
        ...marker,
        clubId,
        uid: user.uid,
        role: "owner",
        status: "active",
        pushNotificationsEnabled: true,
        joinedAt: timestampFromDate(admin, now),
        leftAt: null,
        deletedAt: null,
      },
    },
    {
      path: event.path,
      data: event.data,
    },
    ...buildClubScheduleLockDocs({event}),
    ...await buildParticipationDocsWithLocks({
      db,
      admin,
      marker,
      uid: user.uid,
      event,
      status: "signedUp",
      genderAtSignup: user.data.gender,
      now,
    }),
  ];

  return {
    command: "create-check-in-event",
    operationId,
    phone: user.phoneNumber,
    uid: user.uid,
    eventId,
    clubId: clubId,
    latitude: lat,
    longitude: lng,
    checkInWindowOpensAt: offsetDate(startTime, {minutes: -10}).toISOString(),
    startTime: startTime.toISOString(),
    docs: uniqueDocsByPath(docs),
    aggregateRepairRecommended: true,
  };
}

function finiteNumber(value) {
  if (value == null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function requireExactEventLocation({
  latitude,
  longitude,
  meetingPoint,
  notes,
  command,
}) {
  const lat = finiteNumber(latitude);
  const lng = finiteNumber(longitude);
  const name = typeof meetingPoint === "string" ? meetingPoint.trim() : "";
  if (lat == null || lat < -90 || lat > 90 ||
      lng == null || lng < -180 || lng > 180) {
    throw new Error(
      `${command} requires valid --lat/--lng or stored user coordinates.`
    );
  }
  if (!name) throw new Error(`${command} requires a meeting point.`);
  return {
    name,
    address: null,
    placeId: null,
    latitude: lat,
    longitude: lng,
    notes,
  };
}

export function isDemoOwned(data) {
  return data?.demoOps === true ||
    data?.synthetic === true ||
    typeof data?.seedPrefix === "string";
}

export async function buildValidateDemoStateReport({db, phone, uid, now = new Date()}) {
  const resolved = uid ? {uid, phoneNumber: null} : await resolveUserByPhone(db, phone);
  const userId = resolved.uid;
  const [
    publicProfile,
    matches,
    participations,
    savedEvents,
    payments,
    notifications,
    outgoingSwipes,
    events,
  ] = await Promise.all([
    db.collection("publicProfiles").doc(userId).get(),
    db.collection("matches").where("participantIds", "array-contains", userId).get(),
    db.collection("eventParticipations").where("uid", "==", userId).get(),
    db.collection("savedEvents").where("uid", "==", userId).get(),
    db.collection("payments").where("userId", "==", userId).get(),
    db.collection("notifications").doc(userId).collection("items").get(),
    db.collection("profileDecisions").doc(userId).collection("outgoing").get(),
    db.collection("events").get(),
  ]);

  let messageCount = 0;
  for (const match of matches.docs) {
    const messages = await match.ref.collection("messages").get();
    messageCount += messages.size;
  }

  const counts = {
    activeMatches: matches.docs.filter((doc) => doc.data().status !== "blocked").length,
    messages: messageCount,
    participations: participations.size,
    attendedEvents: participations.docs.filter((doc) => doc.data().status === "attended").length,
    savedEvents: savedEvents.size,
    payments: payments.size,
    notifications: notifications.size,
    outgoingSwipes: outgoingSwipes.size,
    upcomingMappedEvents: countUpcomingMappedEvents(events.docs, now),
    checkInReadyEvents: countCheckInReadyEvents({
      eventDocs: events.docs,
      participationDocs: participations.docs,
      now,
    }),
  };
  const issues = [];
  if (!publicProfile.exists) issues.push(`Missing publicProfiles/${userId}.`);
  if (counts.activeMatches < 3) issues.push("Fewer than 3 active matches.");
  if (counts.messages < 3) issues.push("Fewer than 3 chat messages.");
  if (counts.participations < 3) issues.push("Fewer than 3 event participation edges.");
  if (counts.notifications < 3) issues.push("Fewer than 3 notifications.");
  if (counts.upcomingMappedEvents < 1) issues.push("No upcoming mapped events.");
  if (counts.checkInReadyEvents < 1) {
    issues.push("No signed-up event is currently check-in ready.");
  }

  return {
    uid: userId,
    phone: resolved.phoneNumber ?? null,
    publicProfileExists: publicProfile.exists,
    counts,
    demoReady: issues.length === 0,
    issues,
  };
}

export async function buildDemoChecklist({db, phone, uid, now = new Date()}) {
  const report = await buildValidateDemoStateReport({db, phone, uid, now});
  const canDemo = [];
  const gaps = [];
  addCapability({
    canDemo,
    gaps,
    ok: report.publicProfileExists,
    label: "profile and public profile",
    gap: "public profile is missing",
  });
  addCapability({
    canDemo,
    gaps,
    ok: report.counts.participations > 0,
    label: "event detail and booking state",
    gap: "no event participation edges",
  });
  addCapability({
    canDemo,
    gaps,
    ok: report.counts.attendedEvents > 0,
    label: "post-event recap and swipe entry",
    gap: "no attended events",
  });
  addCapability({
    canDemo,
    gaps,
    ok: report.counts.activeMatches > 0,
    label: "matches tab",
    gap: "no active matches",
  });
  addCapability({
    canDemo,
    gaps,
    ok: report.counts.messages > 0,
    label: "chat thread",
    gap: "no chat messages",
  });
  addCapability({
    canDemo,
    gaps,
    ok: report.counts.savedEvents > 0,
    label: "saved events",
    gap: "no saved events",
  });
  addCapability({
    canDemo,
    gaps,
    ok: report.counts.upcomingMappedEvents > 0,
    label: "event map pins",
    gap: "no upcoming events with map coordinates",
  });
  addCapability({
    canDemo,
    gaps,
    ok: report.counts.checkInReadyEvents > 0,
    label: "location-gated self check-in",
    gap: "no signed-up mapped event inside the check-in window",
  });
  addCapability({
    canDemo,
    gaps,
    ok: report.counts.payments > 0,
    label: "payment history",
    gap: "no payment history",
  });
  addCapability({
    canDemo,
    gaps,
    ok: report.counts.notifications > 0,
    label: "activity notifications",
    gap: "no notifications",
  });
  return {...report, canDemo, gaps};
}

function countUpcomingMappedEvents(eventDocs, now) {
  return eventDocs
    .map((doc) => doc.data())
    .filter((event) => event.status !== "cancelled")
    .filter(hasEventCoordinates)
    .filter((event) => {
      const startTime = dateFromTimestampLike(event.startTime);
      return startTime != null && startTime > now;
    })
    .length;
}

function countCheckInReadyEvents({eventDocs, participationDocs, now}) {
  const eventsById = new Map(eventDocs.map((doc) => [doc.id, doc.data()]));
  return participationDocs
    .map((doc) => doc.data())
    .filter((participation) => participation.status === "signedUp")
    .filter((participation) => {
      const event = eventsById.get(participation.eventId);
      return event != null &&
        event.status !== "cancelled" &&
        hasEventCoordinates(event) &&
        isSelfCheckInWindowOpen(event.startTime, now);
    })
    .length;
}

function hasEventCoordinates(event) {
  return finiteNumber(event.startingPointLat) != null &&
    finiteNumber(event.startingPointLng) != null;
}

function isSelfCheckInWindowOpen(startTimeValue, now) {
  const startTime = dateFromTimestampLike(startTimeValue);
  if (startTime == null) return false;
  const opensAt = offsetDate(startTime, {
    minutes: -SELF_CHECK_IN_WINDOW_BEFORE_MINUTES,
  });
  const closesAt = offsetDate(startTime, {
    minutes: SELF_CHECK_IN_WINDOW_AFTER_MINUTES,
  });
  return now > opensAt && now < closesAt;
}

function dateFromTimestampLike(value) {
  if (typeof value?.toDate === "function") return value.toDate();
  if (value instanceof Date) return value;
  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

function addCapability({canDemo, gaps, ok, label, gap}) {
  if (ok) canDemo.push(label);
  else gaps.push(gap);
}

export async function buildLaunchCleanupPlan({
  db,
  seedPrefixes = [DEFAULT_DEMO_OPS_PREFIX, DEFAULT_SEED_PREFIX],
  keepSeedPrefixes = [],
} = {}) {
  const paths = new Set();
  const topLevel = [
    "users",
    "publicProfiles",
    "clubs",
    "organizers",
    "clubMemberships",
    "clubHostClaims",
    "events",
    "eventParticipations",
    "eventCrossPathsConsents",
    "crossPathsShowcaseEligibility",
    "clubScheduleLocks",
    "userEventScheduleLocks",
    "savedEvents",
    "payments",
    "reviews",
    "matches",
    "seedEvents",
    DEMO_MANIFEST_COLLECTION,
  ];
  for (const collectionName of topLevel) {
    const snap = await db.collection(collectionName).get();
    for (const doc of snap.docs) {
      const data = doc.data();
      if ((isDemoOwned(data) || hasDemoPrefix(doc.id, seedPrefixes)) &&
        !belongsToKeptSeed(data, doc.id, keepSeedPrefixes)) {
        if (collectionName === "matches") {
          const messages = await doc.ref.collection("messages").get();
          for (const message of messages.docs) paths.add(message.ref.path);
        }
        paths.add(doc.ref.path);
      }
    }
  }

  const swipers = await db.collection("profileDecisions").get();
  for (const swiperDoc of swipers.docs) {
    const outgoing = await swiperDoc.ref.collection("outgoing").get();
    for (const doc of outgoing.docs) {
      const data = doc.data();
      if ((isDemoOwned(data) ||
        hasDemoPrefix(swiperDoc.id, seedPrefixes) ||
        hasDemoPrefix(doc.id, seedPrefixes)) &&
        !belongsToKeptSeed(data, doc.id, keepSeedPrefixes) &&
        !hasDemoPrefix(swiperDoc.id, keepSeedPrefixes)) {
        paths.add(doc.ref.path);
      }
    }
  }

  const notificationUsers = await db.collection("notifications").get();
  for (const userDoc of notificationUsers.docs) {
    const items = await userDoc.ref.collection("items").get();
    for (const doc of items.docs) {
      const data = doc.data();
      if ((isDemoOwned(data) ||
        hasDemoPrefix(userDoc.id, seedPrefixes) ||
        hasDemoPrefix(doc.id, seedPrefixes) ||
        hasDemoPrefix(data.matchId, seedPrefixes) ||
        hasDemoPrefix(data.eventId, seedPrefixes) ||
        hasDemoPrefix(data.clubId, seedPrefixes)) &&
        !belongsToKeptSeed(data, doc.id, keepSeedPrefixes) &&
        !hasDemoPrefix(userDoc.id, keepSeedPrefixes)) {
        paths.add(doc.ref.path);
      }
    }
  }

  return {
    command: "cleanup-demo-data",
    paths: [...paths].sort(),
    seedPrefixes,
    keepSeedPrefixes,
  };
}

export async function buildStaleEventCleanupPlan({
  db,
  seedPrefixes = [DEFAULT_DEMO_OPS_PREFIX, DEFAULT_SEED_PREFIX],
  now = new Date(),
  includePast = true,
  includeCancelled = true,
} = {}) {
  if (!includePast && !includeCancelled) {
    throw new Error("Stale event cleanup requires past events, cancelled events, or both.");
  }

  const paths = new Set();
  const staleEventIds = new Set();
  const staleDemoMatchIds = new Set();
  const events = await db.collection("events").get();
  for (const doc of events.docs) {
    const data = doc.data();
    if (!isDemoOwned(data) && !hasDemoPrefix(doc.id, seedPrefixes)) continue;
    const startTime = typeof data.startTime?.toDate === "function" ?
      data.startTime.toDate() :
      null;
    const isPast = includePast && startTime != null && startTime <= now;
    const isCancelled = includeCancelled && data.status === "cancelled";
    if (!isPast && !isCancelled) continue;
    staleEventIds.add(doc.id);
    paths.add(doc.ref.path);
  }

  if (staleEventIds.size === 0) {
    return {
      command: "cleanup-stale-events",
      seedPrefixes,
      staleEventIds: [],
      paths: [],
      aggregateRepairRecommended: false,
    };
  }

  for (const collectionName of [
    "eventParticipations",
    "clubScheduleLocks",
    "userEventScheduleLocks",
    "savedEvents",
    "payments",
    "reviews",
  ]) {
    const snap = await db.collection(collectionName).get();
    for (const doc of snap.docs) {
      if (staleEventIds.has(doc.data().eventId)) paths.add(doc.ref.path);
    }
  }

  const matches = await db.collection("matches").get();
  for (const doc of matches.docs) {
    const data = doc.data();
    const touchesStaleEvent = Array.isArray(data.eventIds) &&
      data.eventIds.some((eventId) => staleEventIds.has(eventId));
    if (!touchesStaleEvent || !isDemoOwned(data)) continue;
    staleDemoMatchIds.add(doc.id);
    const messages = await doc.ref.collection("messages").get();
    for (const message of messages.docs) paths.add(message.ref.path);
    paths.add(doc.ref.path);
  }

  const swipers = await db.collection("profileDecisions").get();
  for (const swiperDoc of swipers.docs) {
    const outgoing = await swiperDoc.ref.collection("outgoing").get();
    for (const doc of outgoing.docs) {
      if (staleEventIds.has(doc.data().eventId)) paths.add(doc.ref.path);
    }
  }

  const notificationUsers = await db.collection("notifications").get();
  for (const userDoc of notificationUsers.docs) {
    const items = await userDoc.ref.collection("items").get();
    for (const doc of items.docs) {
      const data = doc.data();
      if (staleEventIds.has(data.eventId) || staleDemoMatchIds.has(data.matchId)) {
        paths.add(doc.ref.path);
      }
    }
  }

  return {
    command: "cleanup-stale-events",
    seedPrefixes,
    staleEventIds: [...staleEventIds].sort(),
    paths: [...paths].sort(),
    aggregateRepairRecommended: true,
  };
}

function hasDemoPrefix(value, seedPrefixes) {
  return typeof value === "string" &&
    seedPrefixes.some((prefix) => value.startsWith(prefix));
}

function belongsToKeptSeed(data, docId, keepSeedPrefixes) {
  if (keepSeedPrefixes.length === 0) return false;
  if (hasDemoPrefix(docId, keepSeedPrefixes) ||
    hasDemoPrefix(data?.seedPrefix, keepSeedPrefixes)) {
    return true;
  }
  for (const field of [
    "uid",
    "targetId",
    "eventId",
    "clubId",
    "organizerId",
    "matchId",
  ]) {
    if (hasDemoPrefix(data?.[field], keepSeedPrefixes)) return true;
  }
  return Array.isArray(data?.eventIds) &&
    data.eventIds.some((value) => hasDemoPrefix(value, keepSeedPrefixes));
}

export async function applyDocPlan({db, docs}) {
  let written = 0;
  for (const chunk of chunks(docs, DEFAULT_MAX_BATCH_WRITES)) {
    const batch = db.batch();
    for (const doc of chunk) {
      batch.set(db.doc(doc.path), doc.data, {merge: true});
      written += 1;
    }
    await batch.commit();
  }
  return {written};
}

export async function applyDeletePlan({db, paths}) {
  let deleted = 0;
  for (const chunk of chunks(paths, DEFAULT_MAX_BATCH_WRITES)) {
    const batch = db.batch();
    for (const docPath of chunk) {
      batch.delete(db.doc(docPath));
      deleted += 1;
    }
    await batch.commit();
  }
  return {deleted};
}

export async function writeManifest({db, admin, plan, apply, now = new Date()}) {
  const operationId = plan.operationId ??
    demoOperationId({
      command: plan.command ?? "operation",
      seedPrefix: DEFAULT_DEMO_OPS_PREFIX,
      subject: plan.uid ?? plan.matchId ?? String(now.getTime()),
    });
  const paths = plan.docs ? plan.docs.map((doc) => doc.path) : plan.paths ?? [];
  const manifest = {
    command: plan.command,
    operationId,
    applied: apply,
    createdAt: timestampFromDate(admin, now),
    users: plan.users ?? (plan.uid ? [plan.uid] : []),
    phones: plan.phones ?? (plan.phone ? [plan.phone] : []),
    matchId: plan.matchId ?? null,
    eventId: plan.eventId ?? null,
    paths,
    pathCount: paths.length,
  };
  if (apply) {
    await db.collection(DEMO_MANIFEST_COLLECTION).doc(operationId).set(manifest, {merge: true});
  }
  return manifest;
}

export function uniqueDocsByPath(docs) {
  const byPath = new Map();
  for (const doc of docs) byPath.set(doc.path, doc);
  return [...byPath.values()].sort((a, b) => a.path.localeCompare(b.path));
}

export function chunks(items, size) {
  const result = [];
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }
  return result;
}

export function publicName(publicProfile, userProfile = {}) {
  return publicProfile?.name ||
    userProfile.displayName ||
    userProfile.firstName ||
    userProfile.name ||
    "Someone";
}

export function firstPhoto(publicProfile = {}) {
  const primaryPhoto = Array.isArray(publicProfile.profilePhotos) ?
    publicProfile.profilePhotos[0] :
    null;
  return primaryPhoto?.thumbnailUrl ?? primaryPhoto?.url ?? null;
}

export function cityLabel(city) {
  return cityLabels[city] ?? "your city";
}
