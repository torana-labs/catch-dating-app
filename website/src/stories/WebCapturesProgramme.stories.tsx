import type {Meta, StoryObj} from "@storybook/react-vite";
import {programmeFixtures} from "../content/programmes";
import type {ProgramHouseholdRsvpViewCallableResponse as View} from "../firebase";
import {ProgrammeItineraryView} from "../features/programmes/ProgrammeItineraryPage";

// A non-wedding programme's itinerary link as /host/programmes/ shows it, in
// iPhone Safari (tool/marketing/capture_manifest.json, programme-itinerary).
// The household itinerary page the wedding capture draws, read for a
// fictional company offsite at a fictional Goa resort. Every value is
// synthetic, and the copy lives here rather than in website content.
const meta = {
  title: "Marketing Website/Web captures/Programme itinerary",
  parameters: {layout: "fullscreen"},
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

// Fri 15 to Sun 17 Jan 2027, India time.
const at = {
  friLands: 1_799_993_400_000, // 11:40
  friDinner: 1_800_021_600_000, // 19:30
  satKickOff: 1_800_072_000_000, // 09:30
  satSessions: 1_800_090_000_000, // 14:30
  satBonfire: 1_800_102_600_000, // 18:00
  sunWrapUp: 1_800_160_200_000, // 10:00
  sunLeaves: 1_800_178_800_000, // 15:10
};
const hour = 3_600_000;

const offsiteFunctions: View["members"][number]["functions"] = [
  {functionId: "fixture-welcome-dinner", name: "Welcome dinner", startsAtMillis: at.friDinner, endsAtMillis: at.friDinner + 3 * hour,
    venueName: "Beach lawn", dressCode: "Smart casual", instructions: null, rsvpStatus: "attending", partySize: null, responseNote: null},
  {functionId: "fixture-kick-off", name: "Kick-off: the year ahead", startsAtMillis: at.satKickOff, endsAtMillis: at.satKickOff + 2 * hour,
    venueName: "Sea room", dressCode: null, instructions: null, rsvpStatus: "attending", partySize: null, responseNote: null},
  {functionId: "fixture-team-sessions", name: "Team sessions", startsAtMillis: at.satSessions, endsAtMillis: at.satSessions + 3 * hour,
    venueName: "Breakout rooms", dressCode: null, instructions: "Bring your laptop.", rsvpStatus: "attending", partySize: null, responseNote: null},
  {functionId: "fixture-bonfire", name: "Beach games and bonfire", startsAtMillis: at.satBonfire, endsAtMillis: at.satBonfire + 4 * hour,
    venueName: "North beach", dressCode: "Casual", instructions: null, rsvpStatus: "attending", partySize: null, responseNote: null},
  {functionId: "fixture-wrap-up", name: "Wrap-up and awards", startsAtMillis: at.sunWrapUp, endsAtMillis: at.sunWrapUp + 2 * hour,
    venueName: "Sea room", dressCode: null, instructions: null, rsvpStatus: "attending", partySize: null, responseNote: null},
];

type Travel = View["members"][number]["travel"][number];
const flight = (kind: Travel["kind"], flightNumber: string, from: string, to: string, atMillis: number): Travel => ({
  kind, flightNumber, carrierCode: "AI", originIata: from, destinationIata: to, scheduledArrivalAtMillis: atMillis,
  destinationHotelId: kind === "inbound" ? "fixture-hotel-1" : null, destinationLabel: null, passengers: 3, luggageUnits: 3,
});

// The team flies together from Bengaluru and back.
const teamFlights = [flight("inbound", "ZZ 1871", "BLR", "GOI", at.friLands), flight("outbound", "ZZ 1872", "GOI", "BLR", at.sunLeaves)];
const member = (guestId: string, displayName: string, travel: Travel[]) => ({guestId, displayName, functions: offsiteFunctions, travel});

const offsiteView: View = {
  programId: "fixture-program-offsite",
  programTitle: "ByteBanyan Goa Offsite",
  timezone: "Asia/Kolkata",
  householdId: "fixture-household-design",
  householdLabel: "Design team",
  messagingConsentGranted: true,
  members: [
    member("fixture-guest-1", "Kavya", teamFlights),
    member("fixture-guest-2", "Dev", teamFlights),
    member("fixture-guest-3", "Sana", teamFlights),
  ],
  hotels: [{hotelId: "fixture-hotel-1", name: "Sandbar Cove Resort"}],
};

/** The design team's weekend: their flight in, the resort, three days of sessions and dinners, and the flight home. */
export const OffsiteItinerary: Story = {
  render: () => (
    <ProgrammeItineraryView credential={{token: programmeFixtures.token}} refresh={() => undefined} refreshing={false}
      screen={{kind: "ready", view: offsiteView}} />
  ),
};
