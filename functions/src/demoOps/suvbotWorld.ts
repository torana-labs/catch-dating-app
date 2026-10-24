// Builds the Firestore documents for one tester's private copy of a demo
// world at one moment. The world's clock is shifted so the chosen moment is
// now; guest state is derived from the world's attendance records with the
// same rule as tool/demo/lib/demo_world.mjs. Everything is marked synthetic
// and carries a per-tester seed prefix, so discovery hides it and Suvbot's
// reset deletes it.
import {createHash} from "node:crypto";
import {eventDiscoveryProjection} from "../events/eventDiscoveryProjection";
import {cohortIdForUser, normalizePolicy} from "../events/eventPolicy";
import {marketForIdOrAlias} from "../locations/marketConfig";
import type {CanonicalMarket} from "../locations/marketConfig";
import {
  photoPromptCatalog,
} from "../shared/generated/catalogs/photoPromptCatalog";
import {
  profilePromptCatalog,
} from "../shared/generated/catalogs/profilePromptCatalog";
import type {
  EventDocument,
  EventPolicyBundleDocument,
  Gender,
  UserProfileDocument,
} from "../shared/generated/firestoreAdminTypes";
import {
  organizerSupplyCapabilitiesFor,
} from "../shared/organizerSupplyCapabilities";
import {publicProfileFromUserProfileDoc} from "../shared/profileProjection";
import {isReciprocallyEligible} from "../shared/relationshipEligibility";
import {
  DemoWorld,
  DemoWorldAttendance,
  DemoWorldEvent,
  DemoWorldPersona,
  WorldClock,
  isCheckedInAt,
} from "./demoWorld";
import type {DemoDocWrite} from "./suvbotDocValidation";
import {suvbotWorldBundle} from "./generated/suvbotDemoWorlds";

export const SUVBOT_DEMO_MOMENTS = [
  {
    id: "before",
    worldMoment: "planning",
    label: "Before",
    description: "You are booked; the event is a day or more away.",
  },
  {
    id: "today",
    worldMoment: "today",
    label: "Today",
    description: "The event starts in a few hours.",
  },
  {
    id: "live",
    worldMoment: "live",
    label: "Live",
    description: "The event is running and you are checked in.",
  },
  {
    id: "after",
    worldMoment: "followUp",
    label: "After",
    description: "You attended; catches and chats are open.",
  },
] as const;

export type SuvbotDemoMoment = typeof SUVBOT_DEMO_MOMENTS[number]["id"];

const MAX_MATCH_THREADS = 3;
const ALL_GENDERS: Gender[] = ["man", "woman", "nonBinary", "other"];
const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;

const profilePromptTitles = new Map<string, string>(
  profilePromptCatalog.prompts.map((prompt) => [prompt.id, prompt.title])
);
const photoPromptTitles = new Map<string, string>(
  photoPromptCatalog.prompts.map((prompt) => [prompt.id, prompt.title])
);
const personasById = new Map<string, DemoWorldPersona>(
  suvbotWorldBundle.personas.map((persona) => [persona.id, persona])
);

export interface SuvbotWorldPlanInput {
  uid: string;
  user: FirebaseFirestore.DocumentData;
  world: DemoWorld;
  moment: SuvbotDemoMoment;
  now: Date;
  operationId: string;
  command: string;
  timestamp: (date: Date) => FirebaseFirestore.Timestamp;
  matchThreads: boolean;
}

export interface SuvbotWorldSummary {
  worldId: string;
  worldLabel: string;
  moment: SuvbotDemoMoment;
  eventId: string;
  eventName: string;
  testerStatus: "signedUp" | "attended";
  booked: number;
  checkedIn: number;
  capacity: number;
  matchThreadCount: number;
  matchNames: string[];
  savedEventCount: number;
  paidInPaise: number;
}

export interface SuvbotWorldPlan {
  docs: DemoDocWrite[];
  eventIds: string[];
  castUids: string[];
  summary: SuvbotWorldSummary;
}

/**
 * The worlds Suvbot can start, with the moments each one defines.
 * @return {Array<{world: DemoWorld, moments: SuvbotDemoMoment[]}>} Choices.
 */
export function suvbotDemoWorldChoices(): Array<{
  world: DemoWorld;
  moments: SuvbotDemoMoment[];
}> {
  return suvbotWorldBundle.worlds.map((world) => ({
    world,
    moments: SUVBOT_DEMO_MOMENTS
      .filter((moment) => world.moments[moment.worldMoment] !== undefined)
      .map((moment) => moment.id),
  }));
}

/**
 * @param {string} worldId World id.
 * @return {DemoWorld | undefined} Bundled world.
 */
export function findSuvbotDemoWorld(worldId: string): DemoWorld | undefined {
  return suvbotWorldBundle.worlds.find((world) => world.id === worldId);
}

/**
 * The world set in the tester's own market, else the first bundled world.
 * @param {unknown} city The tester's users/{uid}.city market id.
 * @param {function(DemoWorld): boolean} accept Optional world filter.
 * @return {DemoWorld | undefined} World.
 */
export function homeDemoWorld(
  city: unknown,
  accept: (world: DemoWorld) => boolean = () => true
): DemoWorld | undefined {
  const marketId = typeof city === "string" ?
    marketForIdOrAlias(city)?.marketId :
    undefined;
  const worlds = suvbotWorldBundle.worlds.filter(accept);
  return worlds.find((world) =>
    marketForIdOrAlias(world.organizer.city)?.marketId === marketId
  ) ?? worlds[0];
}

/**
 * Parses "worldId moment" (or "worldId/moment") from a chip or typed command.
 * @param {string | undefined} text Request text.
 * @return {object | null} World and moment, or null when unrecognised.
 */
export function parseDemoWorldRequest(
  text: string | undefined
): {world: DemoWorld; moment: SuvbotDemoMoment} | null {
  const words = (text ?? "").toLowerCase().split(/[\s/,:]+/u).filter(Boolean);
  const world = suvbotWorldBundle.worlds.find((item) => words.includes(item.id));
  const moment = SUVBOT_DEMO_MOMENTS.find((item) =>
    words.includes(item.id) || words.includes(item.worldMoment.toLowerCase())
  );
  if (!world || !moment) return null;
  if (world.moments[moment.worldMoment] === undefined) return null;
  return {world, moment: moment.id};
}

/**
 * Seed prefix that scopes every document of one tester's demo world.
 * @param {string} uid Tester uid.
 * @return {string} Prefix.
 */
export function suvbotSeedPrefix(uid: string): string {
  const safe = uid.replace(/[^A-Za-z0-9_-]/gu, "_");
  return safe.length <= 64 ?
    `suvbot_${safe}` :
    `suvbot_${createHash("sha256").update(uid).digest("hex").slice(0, 32)}`;
}

/**
 * Builds every document for one tester's world at one moment.
 * @param {SuvbotWorldPlanInput} input Plan input.
 * @return {SuvbotWorldPlan} Documents and a summary.
 */
export function buildSuvbotWorldPlan(
  input: SuvbotWorldPlanInput
): SuvbotWorldPlan {
  const {uid, user, world, now, timestamp} = input;
  const momentSpec = SUVBOT_DEMO_MOMENTS.find((item) => item.id === input.moment);
  const civilMoment = momentSpec ? world.moments[momentSpec.worldMoment] : "";
  if (!momentSpec || !civilMoment) {
    throw new Error(`${world.id} has no ${input.moment} moment.`);
  }
  const market = requireMarket(world.organizer.city);
  const clock = new WorldClock(world, civilMoment, now);
  const prefix = suvbotSeedPrefix(uid);
  const marker = {
    synthetic: true,
    seedPrefix: prefix,
    scenario: world.id,
    demoOps: true,
    demoOpsId: input.operationId,
    demoOpsCommand: input.command,
  };
  const ids = worldIds(prefix, world);
  const ts = (date: Date) => timestamp(date);
  const docs: DemoDocWrite[] = [];

  // Cast: every world person gets a complete private and public profile, so
  // rosters, catches and chats resolve exactly as for real guests.
  const cast = new Map<string, CastMember>();
  for (const person of world.people) {
    const persona = requirePersona(person.personaId);
    const castUid = ids.cast(person.personaId);
    const userDoc = castUserDoc({persona, world, market, marker, ts});
    cast.set(person.id, {uid: castUid, persona, user: userDoc});
    docs.push({path: `users/${castUid}`, data: userDoc});
    docs.push({
      path: `publicProfiles/${castUid}`,
      data: publicProfileFromUserProfileDoc(
        userDoc as unknown as UserProfileDocument
      ),
    });
  }

  const primary = world.events.find((event) => event.guestPerspective) ??
    world.events[0];
  const testerAttends = input.moment === "live" || input.moment === "after";
  const testerGender = isGender(user.gender) ? user.gender : null;
  const firstMoment = Object.values(world.moments).sort()[0];
  const testerBookedAt = new Date(clock.at(firstMoment).getTime() - 2 * HOUR_MS);
  const primaryStart = clock.atDateTime(primary.civilDate, primary.startTime);
  const primaryEnd = clock.atDateTime(primary.civilDate, primary.endTime);
  const testerCheckedInAt = notAfter(
    new Date(primaryStart.getTime() - 5 * MINUTE_MS), now);

  const eventIds: string[] = [];
  let summaryCounts = {booked: 0, checkedIn: 0};
  let testerPaymentId: string | null = null;

  for (const event of world.events) {
    const eventDocId = ids.event(event.id);
    eventIds.push(eventDocId);
    const records = attendanceAtMoment(event, civilMoment);
    const isPrimary = event.id === primary.id;
    if (isPrimary) {
      makeRoomForTester(records, event.capacity, civilMoment);
    }
    const participations: ParticipationRow[] = [];
    for (const record of records) {
      const member = cast.get(record.personId);
      if (!member) throw new Error(`${world.id} has no person ${record.personId}.`);
      participations.push({
        uid: member.uid,
        user: member.user,
        doc: castParticipationDoc({
          record, civilMoment, clock, eventDocId, organizerId: ids.organizer,
          uid: member.uid, gender: member.persona.gender, marker, ts,
        }),
      });
    }
    if (isPrimary) {
      if (event.priceInPaise > 0) {
        testerPaymentId = `${prefix}_payment_${event.id}`;
        docs.push({
          path: `payments/${testerPaymentId}`,
          data: {
            ...marker,
            userId: uid,
            // Not an "order_…" id: the native refund trigger then stops before
            // it would ask Razorpay about an order that never existed.
            orderId: `${prefix}_order_${event.id}`,
            paymentId: testerPaymentId,
            eventId: eventDocId,
            amount: event.priceInPaise,
            currency: world.currency,
            status: "completed",
            signUpFailed: false,
            createdAt: ts(testerBookedAt),
            completedAt: ts(testerBookedAt),
          },
        });
      }
      participations.push({
        uid,
        user,
        doc: {
          ...marker,
          eventId: eventDocId,
          clubId: ids.organizer,
          organizerId: ids.organizer,
          uid,
          status: testerAttends ? "attended" : "signedUp",
          createdAt: ts(testerBookedAt),
          updatedAt: ts(testerAttends ? testerCheckedInAt : testerBookedAt),
          signedUpAt: ts(testerBookedAt),
          waitlistedAt: null,
          attendedAt: testerAttends ? ts(testerCheckedInAt) : null,
          cancelledAt: null,
          deletedAt: null,
          genderAtSignup: testerGender,
          paymentId: testerPaymentId,
        },
      });
    }
    for (const row of participations) {
      docs.push({
        path: `eventParticipations/${eventDocId}_${row.uid}`,
        data: row.doc,
      });
    }
    const eventDoc = worldEventDoc({
      world, event, eventDocId, organizerId: ids.organizer, market, clock,
      participations, firstMoment, now, marker, ts,
    });
    docs.push({path: `events/${eventDocId}`, data: eventDoc});
    if (isPrimary) {
      summaryCounts = {
        booked: eventDoc.bookedCount as number,
        checkedIn: eventDoc.checkedInCount as number,
      };
    }
  }

  docs.push({
    path: `organizers/${ids.organizer}`,
    data: organizerDoc({
      world, market, hostUid: ids.cast(world.host.personaId), marker, ts,
      createdAt: new Date(clock.at(firstMoment).getTime() - 30 * 24 * HOUR_MS),
      nextEventAt: world.events
        .map((event) => clock.atDateTime(event.civilDate, event.startTime))
        .filter((start) => start > now)
        .sort((a, b) => a.getTime() - b.getTime())[0] ?? null,
    }),
  });

  // The world's other events that have not started are saved for later.
  let savedEventCount = 0;
  for (const event of world.events) {
    if (event.id === primary.id) continue;
    if (clock.atDateTime(event.civilDate, event.startTime) <= now) continue;
    savedEventCount += 1;
    docs.push({
      path: `savedEvents/${uid}_${ids.event(event.id)}`,
      data: {
        ...marker,
        uid,
        eventId: ids.event(event.id),
        savedAt: ts(notAfter(new Date(now.getTime() - HOUR_MS), now)),
      },
    });
  }

  const primaryLocal = clock.local(primaryStart);
  const venue = requireVenue(world, primary.venueId);
  docs.push({
    path: `notifications/${uid}/items/suvbot_signup_${ids.event(primary.id)}`,
    data: {
      ...marker,
      uid,
      type: "eventSignup",
      title: "Spot confirmed",
      body: [
        `You're booked for ${primary.name} at ${primaryLocal.time}.`,
        primary.priceInPaise > 0 ?
          `${formatAmount(primary.priceInPaise, world.currency)} paid.` :
          null,
      ].filter(Boolean).join(" "),
      createdAt: ts(testerBookedAt),
      readAt: input.moment === "before" ? null : ts(testerBookedAt),
      eventId: ids.event(primary.id),
      organizerId: ids.organizer,
    },
  });
  if (input.moment !== "before") {
    docs.push({
      path: `notifications/${uid}/items/suvbot_reminder_${ids.event(primary.id)}`,
      data: {
        ...marker,
        uid,
        type: "eventReminder",
        title: `Today: ${primary.name}`,
        body: `Starts at ${primaryLocal.time} at ${venue.name}.`,
        createdAt: ts(notAfter(
          new Date(primaryStart.getTime() - 4 * HOUR_MS), now)),
        readAt: null,
        eventId: ids.event(primary.id),
        organizerId: ids.organizer,
      },
    });
  }

  const matchNames: string[] = [];
  if (input.moment === "after" && input.matchThreads) {
    const nowMillis = now.getTime();
    const partners = attendanceAtMoment(primary, civilMoment)
      .filter((record) => isCheckedInAt(record, civilMoment))
      .map((record) => cast.get(record.personId))
      .filter((member): member is CastMember => member !== undefined)
      .filter((member) => isReciprocallyEligible({
        viewer: user as unknown as UserProfileDocument,
        candidate: member.user as unknown as UserProfileDocument,
        nowMillis,
      }))
      .slice(0, MAX_MATCH_THREADS);
    const testerFirstName = firstName(user);
    for (const [index, partner] of partners.entries()) {
      matchNames.push(partner.persona.displayName);
      docs.push(...matchThreadDocs({
        uid,
        partner,
        index,
        eventDocId: ids.event(primary.id),
        eventName: primary.name,
        testerFirstName,
        eventEnd: primaryEnd,
        now,
        marker,
        ts,
      }));
    }
  }

  return {
    docs: uniqueByPath(docs),
    eventIds,
    castUids: [...cast.values()].map((member) => member.uid),
    summary: {
      worldId: world.id,
      worldLabel: world.label,
      moment: input.moment,
      eventId: ids.event(primary.id),
      eventName: primary.name,
      testerStatus: testerAttends ? "attended" : "signedUp",
      booked: summaryCounts.booked,
      checkedIn: summaryCounts.checkedIn,
      capacity: primary.capacity,
      matchThreadCount: matchNames.length,
      matchNames,
      savedEventCount,
      paidInPaise: testerPaymentId ? primary.priceInPaise : 0,
    },
  };
}

interface CastMember {
  uid: string;
  persona: DemoWorldPersona;
  user: FirebaseFirestore.DocumentData;
}

interface ParticipationRow {
  uid: string;
  user: FirebaseFirestore.DocumentData;
  doc: FirebaseFirestore.DocumentData;
}

type Marker = Record<string, string | boolean>;
type Stamp = (date: Date) => FirebaseFirestore.Timestamp;

/**
 * Deterministic document ids for one tester's copy of a world.
 * @param {string} prefix Seed prefix.
 * @param {DemoWorld} world World.
 * @return {object} Id builders.
 */
function worldIds(prefix: string, world: DemoWorld) {
  return {
    organizer: `${prefix}_${world.organizer.id}`,
    event: (eventId: string) => `${prefix}_${eventId}`,
    cast: (personaId: string) => `${prefix}_${personaId}`,
  };
}

/**
 * Attendance records that exist at a moment: booked by then, including those
 * cancelled by then (written as cancelled participations).
 * @param {DemoWorldEvent} event Event.
 * @param {string} at Civil moment.
 * @return {DemoWorldAttendance[]} Records, earliest booking first.
 */
function attendanceAtMoment(
  event: DemoWorldEvent,
  at: string
): DemoWorldAttendance[] {
  return event.attendance
    .filter((record) => record.bookedAt <= at)
    .slice()
    .sort((a, b) => a.bookedAt.localeCompare(b.bookedAt));
}

/**
 * Drops the latest active booking when the tester would overfill the event.
 * @param {DemoWorldAttendance[]} records Records at the moment (mutated).
 * @param {number} capacity Event capacity.
 * @param {string} at Civil moment.
 */
function makeRoomForTester(
  records: DemoWorldAttendance[],
  capacity: number,
  at: string
): void {
  const active = () => records.filter((record) =>
    !(record.cancelledAt && record.cancelledAt <= at));
  while (active().length + 1 > capacity) {
    const candidates = active();
    const notCheckedIn = candidates.filter((record) => !isCheckedInAt(record, at));
    const drop = (notCheckedIn.length > 0 ? notCheckedIn : candidates).at(-1);
    if (!drop) return;
    records.splice(records.indexOf(drop), 1);
  }
}

/**
 * One cast member's participation as of the moment.
 * @param {object} params Participation inputs.
 * @return {FirebaseFirestore.DocumentData} Participation document.
 */
function castParticipationDoc(params: {
  record: DemoWorldAttendance;
  civilMoment: string;
  clock: WorldClock;
  eventDocId: string;
  organizerId: string;
  uid: string;
  gender: Gender;
  marker: Marker;
  ts: Stamp;
}): FirebaseFirestore.DocumentData {
  const {record, civilMoment, clock, ts} = params;
  const cancelled = record.cancelledAt !== undefined &&
    record.cancelledAt <= civilMoment;
  const checkedIn = !cancelled && isCheckedInAt(record, civilMoment);
  const bookedAt = clock.at(record.bookedAt);
  const lastChange = cancelled ?
    clock.at(record.cancelledAt as string) :
    checkedIn ? clock.at(record.checkedInAt as string) : bookedAt;
  return {
    ...params.marker,
    eventId: params.eventDocId,
    clubId: params.organizerId,
    organizerId: params.organizerId,
    uid: params.uid,
    status: cancelled ? "cancelled" : checkedIn ? "attended" : "signedUp",
    createdAt: ts(bookedAt),
    updatedAt: ts(lastChange),
    signedUpAt: ts(bookedAt),
    waitlistedAt: null,
    attendedAt: checkedIn ? ts(clock.at(record.checkedInAt as string)) : null,
    cancelledAt: cancelled ? ts(clock.at(record.cancelledAt as string)) : null,
    deletedAt: null,
    genderAtSignup: params.gender,
    paymentId: null,
  };
}

/**
 * A published event document whose counts come from its participations.
 * @param {object} params Event inputs.
 * @return {FirebaseFirestore.DocumentData} Event document.
 */
function worldEventDoc(params: {
  world: DemoWorld;
  event: DemoWorldEvent;
  eventDocId: string;
  organizerId: string;
  market: CanonicalMarket;
  clock: WorldClock;
  participations: ParticipationRow[];
  firstMoment: string;
  now: Date;
  marker: Marker;
  ts: Stamp;
}): FirebaseFirestore.DocumentData {
  const {world, event, clock, ts} = params;
  const venue = requireVenue(world, event.venueId);
  const booked = params.participations.filter((row) =>
    row.doc.status === "signedUp" || row.doc.status === "attended");
  const genderCounts: Record<string, number> = {};
  const cohortCounts: Record<string, number> = {};
  for (const row of booked) {
    const gender = row.doc.genderAtSignup;
    if (typeof gender === "string") {
      genderCounts[gender] = (genderCounts[gender] ?? 0) + 1;
    }
    const cohort = cohortIdForUser(row.user as unknown as UserProfileDocument);
    cohortCounts[cohort] = (cohortCounts[cohort] ?? 0) + 1;
  }
  const eventPolicy = normalizePolicy({
    version: 1,
    admission: admissionFor(event.format.admissionPreset, event.capacity),
    pricing: {basePriceInPaise: event.priceInPaise},
    cancellation: {
      policyId: event.priceInPaise === 0 ? "notApplicable" : "standard",
    },
    settlement: {hostPayoutTiming: "afterEventCompletion"},
  } as unknown as EventPolicyBundleDocument);
  const meetingLocation = {
    name: venue.name,
    address: venue.area,
    placeId: null,
    latitude: venue.lat,
    longitude: venue.lng,
    notes: venue.directions,
  };
  const base: FirebaseFirestore.DocumentData = {
    ...params.marker,
    name: event.name,
    publicationState: "published",
    clubId: params.organizerId,
    organizerId: params.organizerId,
    eventOrigin: {
      mode: "catchNative",
      bookingAuthority: "catch",
      rosterAuthority: "catchProjection",
      provider: "catch",
      externalEventId: null,
      externalEventUrl: null,
      sourceExternalEventId: null,
      adapterVersion: null,
      connectedAt: null,
      connectedBy: null,
    },
    startTime: ts(clock.atDateTime(event.civilDate, event.startTime)),
    endTime: ts(clock.atDateTime(event.civilDate, event.endTime)),
    meetingPoint: venue.name,
    meetingLocation,
    startingPointLat: venue.lat,
    startingPointLng: venue.lng,
    locationDetails: venue.directions,
    itinerary: [],
    photoUrl: null,
    eventPhotos: [],
    eventFormat: {
      version: 1,
      activityKind: event.activityKind,
      interactionModel: event.format.interactionModel,
      ...(event.customActivityLabel ?
        {customActivityLabel: event.customActivityLabel} :
        {}),
      defaultPlaybookId: event.format.playbookId,
      defaultModuleIds: event.format.selectedModuleIds,
    },
    distanceKm: 0,
    pace: "easy",
    capacityLimit: eventPolicy.admission.capacityLimit,
    description: event.description,
    priceInPaise: event.priceInPaise,
    currency: world.currency,
    constraints: {minAge: 0, maxAge: 99, maxMen: null, maxWomen: null},
    eventPolicy,
    bookedCount: booked.length,
    checkedInCount: booked.filter((row) => row.doc.status === "attended").length,
    waitlistedCount: 0,
    status: "active",
    cancelledAt: null,
    cancellationReason: null,
    genderCounts,
    cohortCounts,
    waitlistedCohortCounts: {},
    crossPathsPairHeldCount: 0,
    crossPathsPairConfirmedCount: 0,
    crossPathsPairHeldCohortCounts: {},
    createdAt: ts(new Date(
      clock.at(params.firstMoment).getTime() - 3 * 24 * HOUR_MS)),
    updatedAt: ts(params.now),
  };
  return {
    ...base,
    ...eventDiscoveryProjection({
      event: base as unknown as EventDocument,
      clubLocation: params.market.marketId,
      clubLocationMarketId: params.market.marketId,
      bookedCount: booked.length,
    }),
  };
}

/**
 * Admission terms for a world's admission preset.
 * @param {string} preset Production admission preset.
 * @param {number} capacityLimit Capacity.
 * @return {object} Admission policy.
 */
function admissionFor(preset: string, capacityLimit: number) {
  const base = {
    capacityLimit,
    waitlistPolicy: {mode: "rankedOffer", offerWindowMinutes: 20},
    inviteRequired: false,
    membershipRequired: false,
    manualApprovalRequired: false,
    privateAccessPolicy: {
      mode: "none",
      inviteCodeHint: null,
      privateLinkEnabled: false,
    },
    cohortCapacityLimits: {},
  };
  switch (preset) {
  case "inviteOnly":
    return {...base, format: "inviteOnly", inviteRequired: true};
  case "balancedSingles":
    return {
      ...base,
      format: "balancedRatio",
      balancedRatioPolicy: {
        leftCohortId: "menInterestedInWomen",
        rightCohortId: "womenInterestedInMen",
        maxSkew: 2,
        openingBufferPerCohort: 2,
        outOfRatioCohortPolicy: "waitlist",
      },
    };
  case "fixedCohortCaps":
    return {...base, format: "fixedCohortCaps"};
  default:
    return {...base, format: "open"};
  }
}

/**
 * The world's organizer, hidden from browse surfaces and search.
 * @param {object} params Organizer inputs.
 * @return {FirebaseFirestore.DocumentData} Organizer document.
 */
function organizerDoc(params: {
  world: DemoWorld;
  market: CanonicalMarket;
  hostUid: string;
  marker: Marker;
  ts: Stamp;
  createdAt: Date;
  nextEventAt: Date | null;
}): FirebaseFirestore.DocumentData {
  const {world, market, hostUid, ts} = params;
  const hostPersona = requirePersona(world.host.personaId);
  const hostAvatarUrl = hostPersona.photos[0]?.thumbnailUrl ?? null;
  return {
    ...params.marker,
    name: world.organizer.name,
    description: world.organizer.description,
    location: market.marketId,
    locationCityId: market.cityId,
    locationMarketId: market.marketId,
    area: world.organizer.area,
    hostUserId: hostUid,
    hostName: world.host.displayName,
    hostAvatarUrl,
    ownerUserId: hostUid,
    hostUserIds: [hostUid],
    hostProfiles: [{
      uid: hostUid,
      displayName: world.host.displayName,
      avatarUrl: hostAvatarUrl,
      role: "owner",
    }],
    createdAt: ts(params.createdAt),
    imageUrl: null,
    profileImageUrl: null,
    organizerPhotos: [],
    tags: world.organizer.tags,
    followerCount: world.organizer.memberCount,
    rating: world.organizer.rating,
    reviewCount: world.organizer.reviewCount,
    nextEventAt: params.nextEventAt ? ts(params.nextEventAt) : null,
    nextEventLabel: null,
    instagramHandle: null,
    phoneNumber: null,
    email: world.host.email,
    status: "active",
    archived: false,
    archivedAt: null,
    archiveReason: null,
    organizerType: "club",
    cityName: market.cityLabel,
    regionName: market.regionName,
    countryCode: market.countryIsoCode,
    countryName: market.countryName,
    // Hidden keeps the organizer and its events out of app browse surfaces
    // and the Algolia explore index, which do not filter `synthetic`.
    appVisibility: "hidden",
    supplyCapabilities: organizerSupplyCapabilitiesFor({
      ownershipState: "userCreated",
      claimState: "claimed",
    }),
    ownership: {
      state: "userCreated",
      ownerUserId: hostUid,
      primaryHostUserId: hostUid,
      hostUserIds: [hostUid],
      claimedAt: ts(params.createdAt),
      claimedByUid: hostUid,
    },
    claim: {state: "claimed", claimHref: null, lastClaimRequestId: null},
  };
}

/**
 * A cast member's complete private profile. Cast accept every gender and
 * adult age, so the tester's own preferences decide who they can catch.
 * @param {object} params Profile inputs.
 * @return {FirebaseFirestore.DocumentData} users/{uid} document.
 */
function castUserDoc(params: {
  persona: DemoWorldPersona;
  world: DemoWorld;
  market: CanonicalMarket;
  marker: Marker;
  ts: Stamp;
}): FirebaseFirestore.DocumentData {
  const {persona, world, market, ts} = params;
  const epoch = ts(new Date(0));
  const country = world.locale.split("-")[1];
  return {
    ...params.marker,
    name: `${persona.firstName} ${persona.lastName}`,
    firstName: persona.firstName,
    lastName: persona.lastName,
    displayName: persona.displayName,
    dateOfBirth: ts(new Date(`${persona.dateOfBirth}T00:00:00.000Z`)),
    gender: persona.gender,
    phoneNumber: demoPhoneNumber(persona.id, country),
    profileComplete: true,
    email: `${persona.id.replace(/_/gu, ".")}@example.test`,
    profilePrompts: persona.profilePrompts.map((prompt) => ({
      promptId: prompt.promptId,
      prompt: requireTitle(profilePromptTitles, prompt.promptId),
      answer: prompt.answer,
    })),
    profilePhotos: persona.photos.map((photo, index) => ({
      id: photo.id,
      url: photo.url,
      thumbnailUrl: photo.thumbnailUrl,
      storagePath: photo.storagePath,
      thumbnailStoragePath: photo.thumbnailStoragePath,
      prompt: {
        photoIndex: index,
        promptId: photo.promptId,
        prompt: requireTitle(photoPromptTitles, photo.promptId),
      },
      moderation: {status: "approved"},
      position: index,
      createdAt: epoch,
      updatedAt: epoch,
    })),
    city: market.marketId,
    interestedInGenders: ALL_GENDERS,
    minAgePreference: 18,
    maxAgePreference: 99,
    ...(persona.heightCm !== null ? {height: persona.heightCm} : {}),
    ...(persona.occupation ? {occupation: persona.occupation} : {}),
    ...(persona.company ? {company: persona.company} : {}),
    languages: country === "IN" ? ["english", "hindi"] : ["english"],
    activityPreferences: {
      running: {
        paceMinSecsPerKm: 300,
        paceMaxSecsPerKm: 420,
        preferredDistances: [],
        runningReasons: ["community"],
        preferredRunTimes: [],
        version: 1,
      },
    },
    prefsNewCatches: true,
    prefsMessages: true,
    prefsEventReminders: true,
    prefsRunStatusUpdates: true,
    prefsClubUpdates: true,
    prefsWeeklyDigest: false,
    prefsShowOnMap: false,
  };
}

/**
 * One mutual catch with a cast member: both likes, the match, its alert and,
 * for the first two, an opener drawn from the cast member's own prompts.
 * @param {object} params Thread inputs.
 * @return {DemoDocWrite[]} Documents.
 */
function matchThreadDocs(params: {
  uid: string;
  partner: CastMember;
  index: number;
  eventDocId: string;
  eventName: string;
  testerFirstName: string;
  eventEnd: Date;
  now: Date;
  marker: Marker;
  ts: Stamp;
}): DemoDocWrite[] {
  const {uid, partner, index, ts, now} = params;
  const [user1Id, user2Id] = [uid, partner.uid].sort();
  const matchId = `${user1Id}_${user2Id}`;
  const matchedAt = notAfter(
    new Date(params.eventEnd.getTime() + (30 + index * 7) * MINUTE_MS),
    new Date(now.getTime() - 10 * MINUTE_MS)
  );
  const opener = index < 2 ? openerFor(params) : null;
  const sentAt = notAfter(
    new Date(matchedAt.getTime() + 20 * MINUTE_MS),
    new Date(now.getTime() - MINUTE_MS)
  );
  const swipe = (swiperId: string, targetId: string) => ({
    path: `profileDecisions/${swiperId}/outgoing/${targetId}`,
    data: {
      ...params.marker,
      swiperId,
      targetId,
      eventId: params.eventDocId,
      direction: "like",
      createdAt: ts(new Date(matchedAt.getTime() -
        (swiperId === uid ? 2 : 1) * MINUTE_MS)),
    },
  });
  const docs: DemoDocWrite[] = [
    swipe(uid, partner.uid),
    swipe(partner.uid, uid),
    {
      path: `matches/${matchId}`,
      data: {
        ...params.marker,
        user1Id,
        user2Id,
        participantIds: [user1Id, user2Id],
        eventIds: [params.eventDocId],
        createdAt: ts(matchedAt),
        lastMessageAt: opener ? ts(sentAt) : null,
        lastMessagePreview: opener ? previewText(opener) : null,
        lastMessageSenderId: opener ? partner.uid : null,
        unreadCounts: {[uid]: opener ? 1 : 0, [partner.uid]: 0},
        status: "active",
        blockedBy: null,
        blockedAt: null,
        conversationType: "match",
      },
    },
    {
      // Same id and copy onMatchCreated uses, so the trigger refreshes this
      // alert instead of adding a second one.
      path: `notifications/${uid}/items/match_${matchId}`,
      data: {
        ...params.marker,
        uid,
        type: "match",
        title: "It's a catch",
        body: `You and ${partner.persona.displayName} matched. Say hi!`,
        createdAt: ts(matchedAt),
        readAt: null,
        matchId,
        eventId: params.eventDocId,
        actorUid: partner.uid,
        actorName: partner.persona.displayName,
      },
    },
  ];
  if (opener) {
    docs.push({
      path: `matches/${matchId}/messages/suvbot_opener`,
      data: {
        ...params.marker,
        senderId: partner.uid,
        text: opener,
        imageUrl: null,
        sentAt: ts(sentAt),
      },
    });
  }
  return docs;
}

/**
 * An opener in the cast member's voice, built from their profile prompts.
 * @param {object} params Thread inputs.
 * @return {string} Message text.
 */
function openerFor(params: {
  partner: CastMember;
  eventName: string;
  testerFirstName: string;
}): string {
  const prompts = params.partner.persona.profilePrompts;
  const after = prompts.find((prompt) => prompt.promptId === "afterEvent");
  const greeting = `Good to meet you at ${params.eventName}, ` +
    `${params.testerFirstName}!`;
  if (after) return `${greeting} My usual after-plan: ${after.answer}`;
  const first = prompts[0];
  return first ? `${greeting} ${first.answer}` : greeting;
}

/**
 * @param {FirebaseFirestore.DocumentData} user Tester profile.
 * @return {string} A first name for copy.
 */
function firstName(user: FirebaseFirestore.DocumentData): string {
  for (const key of ["firstName", "displayName", "name"]) {
    const value = user[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim().split(/\s+/u)[0];
    }
  }
  return "there";
}

/**
 * A number in the reserved demo range, stable per persona.
 * @param {string} personaId Persona id ending in a number.
 * @param {string} country Two-letter country code.
 * @return {string} E.164 number.
 */
function demoPhoneNumber(personaId: string, country: string): string {
  const serial = Number(/(\d+)$/u.exec(personaId)?.[1] ?? 0) % 100000;
  if (country === "US") {
    return `+1555010${String(serial % 10000).padStart(4, "0")}`;
  }
  return `+9190000${String(serial).padStart(5, "0")}`;
}

/**
 * @param {string} city World organizer city slug.
 * @return {CanonicalMarket} Market.
 */
function requireMarket(city: string): CanonicalMarket {
  const market = marketForIdOrAlias(city);
  if (!market) throw new Error(`Demo world city ${city} is not a known market.`);
  return market;
}

/**
 * @param {string} personaId Persona id.
 * @return {DemoWorldPersona} Bundled persona.
 */
function requirePersona(personaId: string): DemoWorldPersona {
  const persona = personasById.get(personaId);
  if (!persona) throw new Error(`Persona ${personaId} is not bundled.`);
  return persona;
}

/**
 * @param {DemoWorld} world World.
 * @param {string} venueId Venue id.
 * @return {object} Venue.
 */
function requireVenue(world: DemoWorld, venueId: string) {
  const venue = world.venues.find((item) => item.id === venueId);
  if (!venue) throw new Error(`${world.id} has no venue ${venueId}.`);
  return venue;
}

/**
 * @param {Map<string, string>} titles Prompt titles by id.
 * @param {string} promptId Prompt id.
 * @return {string} Title.
 */
function requireTitle(titles: Map<string, string>, promptId: string): string {
  const title = titles.get(promptId);
  if (!title) throw new Error(`Unknown prompt id ${promptId}.`);
  return title;
}

/**
 * @param {unknown} value Candidate.
 * @return {boolean} True for a profile gender.
 */
function isGender(value: unknown): value is Gender {
  return ALL_GENDERS.includes(value as Gender);
}

/**
 * @param {Date} value Candidate.
 * @param {Date} limit Latest allowed instant.
 * @return {Date} The earlier of the two.
 */
function notAfter(value: Date, limit: Date): Date {
  return value.getTime() > limit.getTime() ? limit : value;
}

/**
 * @param {number} amountMinor Amount in minor units.
 * @param {string} currency ISO currency.
 * @return {string} Display amount.
 */
function formatAmount(amountMinor: number, currency: string): string {
  const symbol = currency === "INR" ? "₹" : `${currency} `;
  const major = amountMinor / 100;
  return `${symbol}${Number.isInteger(major) ? major : major.toFixed(2)}`;
}

/**
 * @param {string} text Message text.
 * @return {string} Chat preview.
 */
function previewText(text: string): string {
  return text.length <= 80 ? text : `${text.slice(0, 80)}…`;
}

/**
 * @param {DemoDocWrite[]} docs Docs.
 * @return {DemoDocWrite[]} Last write per path, sorted by path.
 */
function uniqueByPath(docs: DemoDocWrite[]): DemoDocWrite[] {
  return [...new Map(docs.map((doc) => [doc.path, doc])).values()]
    .sort((a, b) => a.path.localeCompare(b.path));
}
