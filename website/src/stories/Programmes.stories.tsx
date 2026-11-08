import type {Meta, StoryObj} from "@storybook/react-vite";
import {householdRsvpViewFixture} from "../content/householdRsvp";
import {programmeFixtures as fixtures} from "../content/programmes";
import {ProgrammeDriverTripView} from "../features/programmes/ProgrammeDriverTripPage";
import {ProgrammeFamilyView} from "../features/programmes/ProgrammeFamilyPage";
import {ProgrammeGuestIdsView} from "../features/programmes/ProgrammeGuestIdsPage";
import {ProgrammeHampersView} from "../features/programmes/ProgrammeHampersPage";
import {ProgrammeHotelHandoverView} from "../features/programmes/ProgrammeHotelHandoverPage";
import {ProgrammeItineraryView} from "../features/programmes/ProgrammeItineraryPage";
import {ProgrammeRunSheetView} from "../features/programmes/ProgrammeRunSheetPage";
import type {GuestIdDraft} from "../features/programmes/useProgrammeGuestIdsController";
import type {HampersDraft} from "../features/programmes/useProgrammeHampersController";

// The programme's token links, each a board on the white ground: the
// itinerary, IDs, driver, run sheet, hampers and family at the boards' phone width
// (390) and the hotel handover at 1280. Every fixture is synthetic.
const viewports = {
  programmePhone: {name: "Programme link · phone 390", styles: {width: "390px", height: "900px"}, type: "mobile"},
  programmeDesktop: {name: "Programme link · desktop 1280", styles: {width: "1280px", height: "1080px"}, type: "desktop"},
} as const;
const phone = {viewport: {value: "programmePhone", isRotated: false}};
const desktop = {viewport: {value: "programmeDesktop", isRotated: false}};

const meta = {
  title: "Marketing Website/Programme links",
  parameters: {
    viewport: {options: viewports},
    catchComponentRegistry: {path: "design/website/components.json"},
    catchRouteContract: {path: "design/website/routes.json"},
  },
  globals: phone,
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const noop = () => undefined;
const read = {refresh: noop, refreshing: false};
const credential = {token: fixtures.token};
const unavailable = {kind: "unavailable", reason: "invalid"} as const;

// Itinerary: the fixture household said yes to the reception and sent a flight.
const itineraryStates = ["loading", "ready", "empty", "unavailable"];
const itineraryReady = {kind: "ready", view: householdRsvpViewFixture} as const;
const itineraryEmpty = {kind: "ready", view: {...householdRsvpViewFixture,
  members: householdRsvpViewFixture.members.map((member) => ({...member, travel: [],
    functions: member.functions.map((fn) => ({...fn, rsvpStatus: "pending" as const}))}))}} as const;
export const Itinerary: Story = {
  name: "/itinerary/:householdToken/",
  parameters: {
    catchRoute: {id: "programme_itinerary", path: "/itinerary/fixture-programme-token.signature00/",
      reviewStates: itineraryStates, stateCoverage: {storybook: itineraryStates, manual: []}},
    catchComponent: {id: "route_programme_itinerary", routeIds: ["programme_itinerary"], states: itineraryStates},
  },
  render: () => <ProgrammeItineraryView credential={credential} screen={itineraryReady} {...read} />,
};
export const ItineraryReady: Story = {
  parameters: {catchComponent: {id: "programme_itinerary_view", routeIds: ["programme_itinerary"], states: ["ready"]}},
  render: () => <ProgrammeItineraryView credential={credential} screen={itineraryReady} {...read} />,
};
export const ItineraryEmpty: Story = {
  parameters: {catchComponent: {id: "programme_itinerary_view", routeIds: ["programme_itinerary"], states: ["empty"]}},
  render: () => <ProgrammeItineraryView credential={credential} screen={itineraryEmpty} {...read} />,
};
export const ItineraryLoading: Story = {
  parameters: {catchComponent: {id: "programme_itinerary_view", routeIds: ["programme_itinerary"], states: ["loading"]}},
  render: () => <ProgrammeItineraryView credential={credential} screen={{kind: "loading"}} {...read} />,
};
export const ItineraryUnavailable: Story = {
  parameters: {catchComponent: {id: "programme_itinerary_view", routeIds: ["programme_itinerary"], states: ["unavailable"]}},
  render: () => <ProgrammeItineraryView credential={null} screen={unavailable} {...read} />,
};

// IDs: one checked, one waiting, Kamla open to add, Kiara asked again.
const idStates = ["ready", "saving", "unavailable"];
const idDraft: GuestIdDraft = {guestId: "fixture-guest-3", kind: "aadhaar", front: null, back: null, pending: false, notice: ""};
const idActions = {open: noop, setKind: noop, choose: noop, save: noop};
const idsReady = {kind: "ready", view: fixtures.guestIds} as const;
export const GuestIds: Story = {
  name: "/ids/:householdToken/",
  parameters: {
    catchRoute: {id: "programme_ids", path: "/ids/fixture-programme-token.signature00/",
      reviewStates: idStates, stateCoverage: {storybook: idStates, manual: []}},
    catchComponent: {id: "route_programme_ids", routeIds: ["programme_ids"], states: idStates},
  },
  render: () => <ProgrammeGuestIdsView draft={idDraft} screen={idsReady} {...read} {...idActions} />,
};
export const GuestIdsReady: Story = {
  parameters: {catchComponent: {id: "programme_ids_view", routeIds: ["programme_ids"], states: ["ready"]}},
  render: () => <ProgrammeGuestIdsView draft={idDraft} screen={idsReady} {...read} {...idActions} />,
};
export const GuestIdsSaving: Story = {
  parameters: {catchComponent: {id: "programme_ids_view", routeIds: ["programme_ids"], states: ["saving"]}},
  render: () => (
    <ProgrammeGuestIdsView draft={{...idDraft, front: new File(["front"], "front.jpg", {type: "image/jpeg"}), pending: true}}
      screen={idsReady} {...read} {...idActions} />
  ),
};
export const GuestIdsUnavailable: Story = {
  parameters: {catchComponent: {id: "programme_ids_view", routeIds: ["programme_ids"], states: ["unavailable"]}},
  render: () => <ProgrammeGuestIdsView draft={idDraft} screen={unavailable} {...read} {...idActions} />,
};

// Hotel handover at the board's 1280.
const hotelStates = ["ready", "unavailable"];
const hotelReady = {kind: "ready", view: fixtures.hotelHandover} as const;
export const HotelHandover: Story = {
  name: "/hotel/:linkToken/",
  globals: desktop,
  parameters: {
    catchRoute: {id: "programme_hotel", path: "/hotel/fixture-programme-token.signature00/",
      reviewStates: hotelStates, stateCoverage: {storybook: hotelStates, manual: []}},
    catchComponent: {id: "route_programme_hotel", routeIds: ["programme_hotel"], states: hotelStates},
  },
  render: () => <ProgrammeHotelHandoverView download={noop} screen={hotelReady} {...read} />,
};
export const HotelHandoverReady: Story = {
  globals: desktop,
  parameters: {catchComponent: {id: "programme_hotel_view", routeIds: ["programme_hotel"], states: ["ready"]}},
  render: () => <ProgrammeHotelHandoverView download={noop} screen={hotelReady} {...read} />,
};
export const HotelHandoverPhone: Story = {
  render: () => <ProgrammeHotelHandoverView download={noop} screen={hotelReady} {...read} />,
};
export const HotelHandoverUnavailable: Story = {
  globals: desktop,
  parameters: {catchComponent: {id: "programme_hotel_view", routeIds: ["programme_hotel"], states: ["unavailable"]}},
  render: () => <ProgrammeHotelHandoverView download={noop} screen={{kind: "unavailable", reason: "expired"}} {...read} />,
};

// Driver trip.
const tripStates = ["ready", "unavailable"];
const tripReady = {kind: "ready", view: fixtures.driverTrip} as const;
export const DriverTrip: Story = {
  name: "/trip/:linkToken/",
  parameters: {
    catchRoute: {id: "programme_trip", path: "/trip/fixture-programme-token.signature00/",
      reviewStates: tripStates, stateCoverage: {storybook: tripStates, manual: []}},
    catchComponent: {id: "route_programme_trip", routeIds: ["programme_trip"], states: tripStates},
  },
  render: () => <ProgrammeDriverTripView screen={tripReady} {...read} />,
};
export const DriverTripReady: Story = {
  parameters: {catchComponent: {id: "programme_trip_view", routeIds: ["programme_trip"], states: ["ready"]}},
  render: () => <ProgrammeDriverTripView screen={tripReady} {...read} />,
};
export const DriverTripUnavailable: Story = {
  parameters: {catchComponent: {id: "programme_trip_view", routeIds: ["programme_trip"], states: ["unavailable"]}},
  render: () => <ProgrammeDriverTripView screen={{kind: "unavailable", reason: "expired"}} {...read} />,
};

// Vendor run sheet, with the Sangeet on now.
const runSheetStates = ["ready", "unavailable"];
const runSheetReady = {kind: "ready", view: fixtures.runSheet} as const;
export const RunSheet: Story = {
  name: "/runsheet/:linkToken/",
  parameters: {
    catchRoute: {id: "programme_runsheet", path: "/runsheet/fixture-programme-token.signature00/",
      reviewStates: runSheetStates, stateCoverage: {storybook: runSheetStates, manual: []}},
    catchComponent: {id: "route_programme_runsheet", routeIds: ["programme_runsheet"], states: runSheetStates},
  },
  render: () => <ProgrammeRunSheetView now={fixtures.runSheetNow} screen={runSheetReady} {...read} />,
};
export const RunSheetReady: Story = {
  parameters: {catchComponent: {id: "programme_runsheet_view", routeIds: ["programme_runsheet"], states: ["ready"]}},
  render: () => <ProgrammeRunSheetView now={fixtures.runSheetNow} screen={runSheetReady} {...read} />,
};
export const RunSheetUnavailable: Story = {
  parameters: {catchComponent: {id: "programme_runsheet_view", routeIds: ["programme_runsheet"], states: ["unavailable"]}},
  render: () => <ProgrammeRunSheetView now={fixtures.runSheetNow} screen={unavailable} {...read} />,
};

// Hampers: two rooms done, room 220 picked for its photo.
const hamperStates = ["ready", "picked", "unavailable"];
const hampersReady = {kind: "ready", view: fixtures.hampers} as const;
const hamperDraft: HampersDraft = {stayId: null, pending: false, notice: ""};
const hamperActions = {pick: noop, photo: noop};
export const Hampers: Story = {
  name: "/hampers/:linkToken/",
  parameters: {
    catchRoute: {id: "programme_hampers", path: "/hampers/fixture-programme-token.signature00/",
      reviewStates: hamperStates, stateCoverage: {storybook: hamperStates, manual: []}},
    catchComponent: {id: "route_programme_hampers", routeIds: ["programme_hampers"], states: hamperStates},
  },
  render: () => <ProgrammeHampersView draft={hamperDraft} screen={hampersReady} {...read} {...hamperActions} />,
};
export const HampersReady: Story = {
  parameters: {catchComponent: {id: "programme_hampers_view", routeIds: ["programme_hampers"], states: ["ready"]}},
  render: () => <ProgrammeHampersView draft={hamperDraft} screen={hampersReady} {...read} {...hamperActions} />,
};
export const HampersPicked: Story = {
  parameters: {catchComponent: {id: "programme_hampers_view", routeIds: ["programme_hampers"], states: ["picked"]}},
  render: () => <ProgrammeHampersView draft={{...hamperDraft, stayId: "s-220"}} screen={hampersReady} {...read} {...hamperActions} />,
};
export const HampersUnavailable: Story = {
  parameters: {catchComponent: {id: "programme_hampers_view", routeIds: ["programme_hampers"], states: ["unavailable"]}},
  render: () => <ProgrammeHampersView draft={hamperDraft} screen={unavailable} {...read} {...hamperActions} />,
};

// Family: the view-only counts in the planner's marigold, 45 days out.
const familyStates = ["ready", "unavailable"];
const familyReady = {kind: "ready", view: fixtures.family} as const;
export const Family: Story = {
  name: "/family/:linkToken/",
  parameters: {
    catchRoute: {id: "programme_family", path: "/family/fixture-programme-token.signature00/",
      reviewStates: familyStates, stateCoverage: {storybook: familyStates, manual: []}},
    catchComponent: {id: "route_programme_family", routeIds: ["programme_family"], states: familyStates},
  },
  render: () => <ProgrammeFamilyView screen={familyReady} {...read} />,
};
export const FamilyReady: Story = {
  parameters: {catchComponent: {id: "programme_family_view", routeIds: ["programme_family"], states: ["ready"]}},
  render: () => <ProgrammeFamilyView screen={familyReady} {...read} />,
};
export const FamilyUnavailable: Story = {
  parameters: {catchComponent: {id: "programme_family_view", routeIds: ["programme_family"], states: ["unavailable"]}},
  render: () => <ProgrammeFamilyView screen={unavailable} {...read} />,
};
