/* eslint-disable max-len */
import type {FactPackInput} from "./facts";

// Test fixture: the Mehra household plus one stray record of another
// household that the fact pack must drop.

const at = (iso: string) => Date.parse(iso);

export function factInput(overrides: Partial<FactPackInput> = {}): FactPackInput {
  return {
    program: {programId: "program-1", title: "Aditi and Kabir's wedding",
      timezone: "Asia/Kolkata", startsAtMillis: at("2026-12-11T06:00:00Z"),
      endsAtMillis: at("2026-12-13T18:00:00Z")},
    household: {householdId: "hh-mehra", label: "The Mehra family",
      memberGuestIds: ["neha", "kamla"]},
    members: [
      {guestId: "neha", displayName: "Neha Mehra", invitationStatus: "responded",
        rsvpStatus: "attending"},
      {guestId: "kamla", displayName: "Kamla Mehra", invitationStatus: "invited",
        rsvpStatus: "pending"},
      // Another household's guest passed in by mistake: must never render.
      {guestId: "iyer", displayName: "Ravi Iyer", invitationStatus: "invited",
        rsvpStatus: "attending"},
    ],
    functions: [
      {functionId: "haldi", name: "Haldi", startsAtMillis: at("2026-12-13T04:30:00Z"),
        endsAtMillis: at("2026-12-13T07:00:00Z"), venueName: "The Courtyard",
        status: "scheduled", dressCode: "Yellow", instructions: null,
        invitationMode: "allGuests"},
      {functionId: "sangeet", name: "Sangeet", startsAtMillis: at("2026-12-12T13:30:00Z"),
        endsAtMillis: at("2026-12-12T18:00:00Z"), venueName: "Lakeside Lawn",
        status: "scheduled", dressCode: null, instructions: "Cars leave the porch at 6:45 PM",
        invitationMode: "selectedGuests"},
      {functionId: "brunch", name: "Cancelled brunch", startsAtMillis: at("2026-12-11T05:00:00Z"),
        endsAtMillis: at("2026-12-11T07:00:00Z"), venueName: "Cafe", status: "cancelled",
        dressCode: null, instructions: null, invitationMode: "allGuests"},
      {functionId: "family-only", name: "Iyer family puja",
        startsAtMillis: at("2026-12-11T09:00:00Z"), endsAtMillis: at("2026-12-11T10:00:00Z"),
        venueName: "Temple", status: "scheduled", dressCode: null, instructions: null,
        invitationMode: "selectedGuests"},
    ],
    functionGuests: [
      {functionId: "sangeet", guestId: "neha", invited: true, rsvpStatus: "attending",
        partySize: 2},
      {functionId: "family-only", guestId: "iyer", invited: true, rsvpStatus: "attending",
        partySize: null},
    ],
    stays: [
      {guestId: "neha", hotelId: "taj", roomLabel: "216",
        startsAtMillis: at("2026-12-11T08:00:00Z"), endsAtMillis: at("2026-12-14T05:00:00Z"),
        status: "confirmed"},
      {guestId: "iyer", hotelId: "taj", roomLabel: "230", startsAtMillis: null,
        endsAtMillis: null, status: "confirmed"},
    ],
    hotels: [{hotelId: "taj", name: "Taj Fateh Prakash", address: "City Palace, Udaipur",
      active: true}],
    travelLegs: [
      {legId: "leg-neha", guestId: "neha", kind: "inbound", flightNumber: "AI471",
        originIata: "DEL", destinationIata: "UDR",
        scheduledArrivalAtMillis: at("2026-12-11T07:00:00Z"), estimatedArrivalAtMillis: null,
        flightStatus: "scheduled", pickupPointId: "udr-arrivals",
        destinationHotelId: "taj", destinationLabel: null},
      {legId: "leg-iyer", guestId: "iyer", kind: "inbound", flightNumber: "6E201",
        originIata: "BOM", destinationIata: "UDR", scheduledArrivalAtMillis: null,
        estimatedArrivalAtMillis: null, flightStatus: null, pickupPointId: null,
        destinationHotelId: null, destinationLabel: null},
    ],
    pickupPoints: [{pickupPointId: "udr-arrivals", label: "UDR arrivals", terminal: null,
      meetingZone: "Gate 2", instructions: "Pooja meets you with a sign", active: true}],
    ...overrides,
  };
}
