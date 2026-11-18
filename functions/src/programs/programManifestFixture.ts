import * as admin from "firebase-admin";
import {CallableRequest} from "firebase-functions/v2/https";

export const ts = (millis: number) =>
  admin.firestore.Timestamp.fromMillis(millis);
export const NOW = 1_800_000_000_000;

import {FakeFirestore as MiniFirestore, type FakeData} from
  "../shared/testing/programFirestore";

export function seed(): Record<string, FakeData> {
  return {
    "organizerPrograms/program-1": {
      organizerId: "org-1", timezone: "Asia/Kolkata", createdBy: "manager-1",
    },
    "organizers/org-1": {
      hostUserId: "manager-1",
      ownerUserId: "manager-1",
      hostUserIds: ["manager-1"],
      hostProfiles: [],
    },
    "programHotels/hotel-1": {
      programId: "program-1", organizerId: "org-1", name: "Harbourview Palace",
      active: true,
    },
    "programPickupPoints/pickup-1": {
      programId: "program-1", organizerId: "org-1", label: "DEL T3 Arrivals",
      kind: "airport", active: true,
    },
  };
}

export function request(data: unknown, uid = "manager-1") {
  return {data, auth: {uid}} as CallableRequest<unknown>;
}

export function deps(store: MiniFirestore) {
  return {
    firestore: () => store as unknown as FirebaseFirestore.Firestore,
    checkRateLimit: async () => undefined,
    now: () => ts(NOW),
  } as never;
}

export const row = {
  displayName: "Rohan Sharma",
  phoneE164: "+919900001111",
  householdLabel: "Sharma Family",
  partyLabel: "Sharma party",
  flightNumber: "AI-847",
  originIata: "BOM",
  destinationIata: "DEL",
  scheduledArrivalAtMillis: NOW + 2 * 3600_000,
  pickupPointLabel: "DEL T3 Arrivals",
  destinationHotelName: "Harbourview Palace",
  passengers: 2,
  luggageUnits: 3,
};
