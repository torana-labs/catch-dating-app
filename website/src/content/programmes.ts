import {brand} from "./brand.ts";

// The programme's token links (P4.10): the household itinerary and ID page,
// the hotel front desk's rooming list, a driver's trip, a vendor's run sheet
// the porters' hampers and the family's view-only counts. Copy follows the
// RbProgItinerary, RbProgIdGuest, RbProgHotelHandover, RbProgDriver,
// RbProgRunSheet, RbProgHampers and RbHostProgramShare boards.

/** What every programme link says while it loads, or when it cannot open. */
export const programmeLinkCopy = {
  brand: brand.name,
  loading: "Opening your link…",
  loadingTitle: "Just a moment",
  invalidTitle: "This link isn't available",
  invalidBody: "It may be mistyped or no longer shared. Ask whoever sent it for a new one.",
  expiredTitle: "This link has expired",
  expiredBody: "Ask whoever sent it for a new one.",
  networkTitle: "We couldn't open this link",
  networkBody: "Check your connection and try again.",
  refresh: "Try again",
  refreshing: "Trying again…",
  madeWith: `Made with ${brand.name}`,
  /** The made-with line with the planner's credit line after a middle dot. */
  madeWithCredit: (credit: string) => `Made with ${brand.name} · ${credit}`,
  viewOnly: "View only",
  mainLabel: "Programme link",
};

export const programmeItineraryCopy = {
  kicker: "Your weekend",
  title: (household: string) => `See you there, ${household}`,
  addToCalendar: "Add to calendar",
  changeReply: "Change our reply",
  gettingThere: "Getting there",
  staying: "Where you're staying",
  goingHome: "Going home",
  flight: (flight: string) => flight,
  lands: (when: string) => `lands ${when}`,
  leaves: (when: string) => `at ${when}`,
  passengers: (count: number) => count === 1 ? "1 traveller" : `${count} travellers`,
  stayingAt: (hotel: string) => hotel,
  whoIsComing: (names: string) => names,
  maybe: "Maybe",
  wear: (dressCode: string) => dressCode,
  nothingYet: "Nothing on your weekend yet",
  nothingYetBody: "Say who's coming to each function and your days fill in here.",
  reply: "Send our reply",
};

export const programmeGuestIdsCopy = {
  title: "IDs for the hotel",
  lead: "Hotels in India record an ID for every adult guest. Add them now and check-in takes a minute instead of twenty.",
  privacy: "Only the hotel front desk and your planner's team can see these. They are deleted three days after you check out.",
  added: "Added",
  add: "Add",
  statusMissing: "Still needed",
  statusSubmitted: "Sent · waiting for a check",
  statusAccepted: "Checked",
  statusAskedAgain: "Asked for a clearer photo",
  kindLabel: "Kind of ID",
  kinds: {aadhaar: "Aadhaar", passport: "Passport", licence: "Licence", voterId: "Voter ID"},
  front: "Front",
  back: "Back",
  chosen: (side: string) => `${side} · added`,
  chooseFront: (name: string) => `Choose the front of ${name}'s ID`,
  chooseBack: (name: string) => `Choose the back of ${name}'s ID`,
  help: "A masked Aadhaar is fine: only the last four digits show. Make sure all four corners are in the photo.",
  save: (name: string) => `Save ${name}'s ID`,
  saving: "Saving…",
  replace: (name: string) => `Send ${name}'s ID again`,
  saved: (name: string) => `${name}'s ID is saved. Your planner checks it next.`,
  failed: "We couldn't save the ID. Check your connection and try again.",
  tooLarge: "That file is over 10 MB. Choose a smaller photo.",
  wrongType: "Choose a photo (JPG, PNG or WebP) or a PDF.",
  needFront: "Add the front of the ID first.",
};

export const programmeHotelHandoverCopy = {
  topBar: (hotel: string) => `${hotel} · front desk`,
  kicker: (organizer: string | null, programme: string) => organizer ? `From ${organizer} · ${programme}` : programme,
  title: "Rooming list and guest IDs",
  lead: (guests: number, rooms: number, until: string) =>
    `${guests} guests in ${rooms} rooms. This link works for your front desk until ${until}.`,
  download: "Download the rooming list",
  statRooms: "Rooms",
  statGuests: "Guests",
  statIds: "IDs complete",
  statIdsValue: (accepted: number, guests: number) => `${accepted} of ${guests}`,
  statMissing: "IDs missing",
  statMissingNote: "still coming",
  table: "Rooming list with ID status",
  columnRoom: "Room",
  columnGuests: "Guests",
  columnArrives: "Arrives",
  columnIds: "IDs",
  columnOpen: "For the desk",
  idsOf: (accepted: number, total: number) => `${accepted} of ${total}`,
  noRoom: "To be assigned",
  departs: (when: string) => `Leaves ${when}`,
  openFront: (name: string) => `${name} · front`,
  openBack: (name: string) => `${name} · back`,
  openVisa: (name: string) => `${name} · visa`,
  privacy: "IDs are here for check-in and your guest register only. Open them one room at a time; every view is logged and shared with the planner. They are deleted three days after the last checkout.",
  photosExpire: "ID photos open for a few minutes. Reload the page to open them again.",
  csvHeader: ["Room", "Guest", "Arrives", "Leaves", "ID"],
  csvIdStatus: {accepted: "Checked", pending: "Waiting for a check", missing: "Missing"},
  csvFile: (hotel: string) => `${hotel} rooming list.csv`,
};

export const programmeDriverTripCopy = {
  topBar: (programme: string) => `${programme} · trip`,
  kicker: (parts: readonly string[]) => parts.join(" · "),
  trip: (id: string) => `Trip ${id}`,
  title: (from: string | null, to: string | null) => from && to ? `${from} to ${to}` : to ?? from ?? "Your trip",
  pickup: (place: string) => `Pick up · ${place}`,
  drop: (place: string) => `Drop · ${place}`,
  left: (when: string) => `Left ${when}`,
  notLeft: "Not left yet",
  passengers: "Passengers",
  seats: (count: number) => count === 1 ? "1 passenger" : `${count} passengers`,
  party: (name: string, count: number) => `${name} · ${count}`,
  bags: (count: number) => count === 1 ? "1 bag" : `${count} bags`,
  directions: "Directions",
  status: {enRoute: "On the way", arrived: "Arrived", cancelled: "Cancelled", voided: "Cancelled"} as Record<string, string>,
};

export const programmeRunSheetCopy = {
  topBar: (programme: string) => `${programme} · vendors`,
  title: "Run sheet",
  kicker: (vendor: string) => vendor,
  done: "Done",
  now: "Now",
  next: "Next",
  trips: "Your trips",
  tripsNote: (count: number) => count === 1 ? "1 trip" : `${count} trips`,
  tripTitle: (from: string | null, to: string | null) => from && to ? `${from} to ${to}` : to ?? from ?? "Trip",
  tripSubtitle: (plate: string | null, people: number) =>
    [plate, people === 1 ? "1 person" : `${people} people`].filter(Boolean).join(" · "),
  nothing: "Nothing on the run sheet yet",
  status: {enRoute: "On the way", arrived: "Arrived", cancelled: "Cancelled", voided: "Cancelled"} as Record<string, string>,
};

export const programmeHampersCopy = {
  title: "Welcome hampers",
  done: (placed: number, rooms: number) => `${placed} of ${rooms} rooms done`,
  meter: "Hampers placed",
  room: (label: string | null) => label ? `Room ${label}` : "Room to be assigned",
  guests: (count: number) => count === 1 ? "1 guest" : `${count} guests`,
  placedAt: (when: string, photo: boolean) => photo ? `Placed ${when} · photo` : `Placed ${when}`,
  notYet: "Not yet",
  doneBadge: "Done",
  placed: "Placed",
  takePhoto: "Placed · take a photo",
  takePhotoFor: (room: string) => `Take a photo of the hamper in ${room}`,
  photos: "Photos",
  photosNote: "Shared with the planner",
  photoAlt: (room: string) => `Hamper in ${room}`,
  saving: "Saving…",
  failed: "We couldn't save that. Check your connection and try again.",
  savedRoom: (room: string) => `${room} is done.`,
  pickRoom: "Tap Placed on a room first.",
  photoProblem: "Choose a photo (JPG, PNG or WebP) under 10 MB.",
  selected: (room: string) => room,
};

export const programmeFamilyCopy = {
  sharedBy: "Shared by your planner",
  kicker: (dates: string, daysToGo: number | null) =>
    daysToGo === null || daysToGo < 0 ? dates :
      `${dates} · ${daysToGo === 0 ? "today" : daysToGo === 1 ? "1 day to go" : `${daysToGo} days to go`}`,
  dates: (first: string, last: string) => first === last ? first : `${first} to ${last}`,
  updated: (time: string) => `Updated at ${time}. Numbers change as guests reply.`,
  guests: "Guests",
  guestsNote: (households: number) => households === 1 ? "in 1 household" : `in ${households} households`,
  replied: "Households replied",
  repliedNote: (waiting: number) => waiting === 0 ? "Everyone has replied" : `${waiting} still to reply`,
  coming: "Who's coming to what",
  comingLine: (when: string, venue: string | null) => venue ? `${when} · ${venue}` : when,
  comingProgress: (name: string, coming: number, invited: number) => `${name}: ${coming} of ${invited} invited`,
  noFunctions: "No functions planned yet.",
  caterer: "For the caterer",
  heads: (name: string) => name,
  waiting: "Still to hear from",
  waitingLine: (households: number) => households === 0 ? "Every household has replied." :
    households === 1 ? "1 household hasn't replied yet." : `${households} households haven't replied yet.`,
  numbersOnly: "This link shows numbers only. Names, phone numbers and rooms stay with your planner.",
};

const base = 1_800_500_000_000;
const hour = 3_600_000;

/** Deterministic story and test fixtures; never a live programme or token. */
export const programmeFixtures = {
  token: "fixture-programme-token.signature00",
  guestIds: {
    programId: "fixture-program",
    programTitle: "Aditi & Kabir",
    householdLabel: "Mehra family",
    members: [
      {guestId: "fixture-guest-1", displayName: "Neha Mehra", status: "accepted" as const},
      {guestId: "fixture-guest-2", displayName: "Rohan Mehra", status: "submitted" as const},
      {guestId: "fixture-guest-3", displayName: "Kamla Mehra", status: "missing" as const},
      {guestId: "fixture-guest-4", displayName: "Kiara Mehra", status: "askedAgain" as const},
    ],
  },
  hotelHandover: {
    programId: "fixture-program",
    hotelId: "fixture-hotel",
    hotelName: "Taj Fateh Prakash",
    programTitle: "Aditi and Kabir's wedding",
    organizerName: "Meher Shah Weddings",
    counts: {rooms: 3, guests: 5, idsAccepted: 3, idsMissing: 1},
    rooms: [
      {roomLabel: "118", arrivesAtMillis: base, departsAtMillis: base + 96 * hour, guests: [
        {guestId: "g-ritu", displayName: "Ritu Kapoor", idStatus: "pending" as const, idKind: null, numberLast4: null, frontUrl: null, backUrl: null, visaUrl: null},
      ]},
      {roomLabel: "214", arrivesAtMillis: base, departsAtMillis: base + 96 * hour, guests: [
        {guestId: "g-neha", displayName: "Neha Mehra", idStatus: "accepted" as const, idKind: "aadhaar" as const, numberLast4: "3307", frontUrl: "https://example.com/front-neha", backUrl: "https://example.com/back-neha", visaUrl: null},
        {guestId: "g-rohan", displayName: "Rohan Mehra", idStatus: "accepted" as const, idKind: "passport" as const, numberLast4: "9921", frontUrl: "https://example.com/front-rohan", backUrl: null, visaUrl: null},
      ]},
      {roomLabel: "230", arrivesAtMillis: base + 2 * hour, departsAtMillis: base + 96 * hour, guests: [
        {guestId: "g-arjun", displayName: "Arjun Iyer", idStatus: "missing" as const, idKind: null, numberLast4: null, frontUrl: null, backUrl: null, visaUrl: null},
        {guestId: "g-meera", displayName: "Meera Iyer", idStatus: "accepted" as const, idKind: "licence" as const, numberLast4: "1180", frontUrl: "https://example.com/front-meera", backUrl: null, visaUrl: null},
      ]},
    ],
    urlsExpireAtMillis: base + 600_000,
    expiresAtMillis: base + 168 * hour,
  },
  driverTrip: {
    programId: "fixture-program",
    tripId: "T-041",
    programTitle: "Aditi & Kabir",
    status: "enRoute" as const,
    vehicleClassLabel: "Innova",
    plateDisplay: "RJ 27 TA 4471",
    pickupLabel: "Udaipur airport, gate 2",
    destinationLabel: "Taj Fateh Prakash, main porch",
    departedAtMillis: base,
    passengerCount: 6,
    passengers: [
      {name: "The Mehra family", passengers: 4, luggageUnits: 6},
      {name: "Ritu Kapoor and Neel", passengers: 2, luggageUnits: 3},
    ],
    expiresAtMillis: base + 24 * hour,
  },
  runSheet: {
    programId: "fixture-program",
    vendorId: "fixture-vendor",
    vendorName: "Shree Travels",
    programTitle: "Aditi & Kabir",
    timezone: "Asia/Kolkata",
    functions: [
      {functionId: "f-mehendi", name: "Mehendi", venueName: "Garden lawn", startsAtMillis: base, endsAtMillis: base + 3 * hour},
      {functionId: "f-sangeet", name: "Sangeet", venueName: "Durbar hall", startsAtMillis: base + 4 * hour, endsAtMillis: base + 7 * hour},
      {functionId: "f-wedding", name: "Wedding", venueName: "Lakeside", startsAtMillis: base + 27 * hour, endsAtMillis: base + 31 * hour},
    ],
    trips: [
      {tripId: "t-1", status: "arrived" as const, plateDisplay: "RJ 27 TA 4471", pickupLabel: "Udaipur airport", destinationLabel: "Taj Fateh Prakash", departedAtMillis: base - 2 * hour, arrivedAtMillis: base - hour, passengerCount: 6},
      {tripId: "t-2", status: "enRoute" as const, plateDisplay: "RJ 27 TB 1102", pickupLabel: "Taj Fateh Prakash", destinationLabel: "Durbar hall", departedAtMillis: base + 3.5 * hour, arrivedAtMillis: null, passengerCount: 5},
    ],
    expiresAtMillis: base + 168 * hour,
  },
  /** The run sheet's clock in stories: the Sangeet is on. */
  runSheetNow: base + 5 * hour,
  family: {
    programId: "fixture-program",
    programTitle: "Aditi & Kabir",
    timezone: "Asia/Kolkata",
    startsAtMillis: base,
    endsAtMillis: base + 52 * hour,
    serverTimeMillis: base - 45 * 24 * hour,
    guestCount: 312,
    householdCount: 118,
    householdsRepliedCount: 80,
    functions: [
      {functionId: "f-mehendi", name: "Mehendi", startsAtMillis: base, venueName: "Garden lawn", invitedCount: 240, rsvpAttending: 184, rsvpMaybe: 12, rsvpPending: 30, expectedHeads: 201},
      {functionId: "f-sangeet", name: "Sangeet", startsAtMillis: base + 4 * hour, venueName: "Durbar hall", invitedCount: 312, rsvpAttending: 266, rsvpMaybe: 9, rsvpPending: 28, expectedHeads: 290},
      {functionId: "f-wedding", name: "Wedding", startsAtMillis: base + 27 * hour, venueName: "Lakeside", invitedCount: 312, rsvpAttending: 298, rsvpMaybe: 2, rsvpPending: 10, expectedHeads: 321},
    ],
    branding: {color: "marigold" as const, coverImagePath: null, creditLine: "Meher Shah Weddings"},
    expiresAtMillis: base + 76 * hour,
  },
  hampers: {
    programId: "fixture-program",
    hotelId: "fixture-hotel",
    hotelName: "Taj Fateh Prakash",
    programTitle: "Aditi & Kabir",
    counts: {rooms: 4, placed: 2},
    rooms: [
      {roomKey: "214", roomLabel: "214", stayId: "s-214", guestCount: 2, status: "placed" as const, placedAtMillis: base, photoUrl: "https://example.com/hamper-214", revision: 2},
      {roomKey: "216", roomLabel: "216", stayId: "s-216", guestCount: 2, status: "placed" as const, placedAtMillis: base + 120_000, photoUrl: null, revision: 1},
      {roomKey: "220", roomLabel: "220", stayId: "s-220", guestCount: 3, status: "pending" as const, placedAtMillis: null, photoUrl: null, revision: 0},
      {roomKey: "230", roomLabel: "230", stayId: "s-230", guestCount: 4, status: "pending" as const, placedAtMillis: null, photoUrl: null, revision: 0},
    ],
    urlsExpireAtMillis: base + 600_000,
    expiresAtMillis: base + 48 * hour,
  },
};
