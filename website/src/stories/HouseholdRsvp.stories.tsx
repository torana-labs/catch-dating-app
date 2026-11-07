import type {Meta, StoryObj} from "@storybook/react-vite";
import {expect, within} from "storybook/test";
import {householdRsvpCopy, householdRsvpViewFixture} from "../content/householdRsvp";
import {HouseholdRsvpView} from "../features/householdRsvp/HouseholdRsvpPage";
import {draftsFromView, travelDraftsFromView, type HouseholdRsvpScreen} from "../features/householdRsvp/householdRsvpModel";

// The household reply page, each state of the RbProgRsvp board on the white
// ground at the board's phone width. The fixture is synthetic.
type Props = Parameters<typeof HouseholdRsvpView>[0];
const noop = () => undefined;
const view = householdRsvpViewFixture;
const ready: Extract<HouseholdRsvpScreen, {kind: "ready"}> = {
  kind: "ready", view, drafts: draftsFromView(view), travelDrafts: travelDraftsFromView(view),
  messagingConsent: false, dirty: true, pending: false, submitted: false, notice: "",
};
const args: Props = {credential: {token: "fixture-household-token-0000"}, screen: ready, setResponse: noop, setConsent: noop,
  setTravel: noop, submit: noop, refresh: noop, refreshing: false};

/** The board's phone frame at 390 and a desktop at 1280. */
const viewports = {
  rsvpPhone: {name: "RSVP · phone 390", styles: {width: "390px", height: "900px"}, type: "mobile"},
  rsvpDesktop: {name: "RSVP · desktop 1280", styles: {width: "1280px", height: "900px"}, type: "desktop"},
} as const;

const meta = {
  title: "Marketing Website/Household RSVP",
  component: HouseholdRsvpView,
  parameters: {viewport: {options: viewports}},
  globals: {viewport: {value: "rsvpPhone", isRotated: false}},
  args,
} satisfies Meta<typeof HouseholdRsvpView>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Who is coming to each function, the travel and the consent, ready to send. */
export const Ready: Story = {
  parameters: {catchComponent: {id: "household_rsvp_view", routeIds: ["household_rsvp"], states: ["ready"]}},
  play: async ({canvasElement}) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("heading", {level: 1, name: view.programTitle})).toBeVisible();
    await expect(canvas.getByRole("button", {name: householdRsvpCopy.submit})).toBeEnabled();
  },
};
export const Desktop: Story = {globals: {viewport: {value: "rsvpDesktop", isRotated: false}}};
export const Sending: Story = {args: {screen: {...ready, pending: true}}};
export const Saved: Story = {parameters: {catchComponent: {id: "household_rsvp_view", routeIds: ["household_rsvp"], states: ["saved"]}}, args: {screen: {...ready, dirty: false, submitted: true, notice: householdRsvpCopy.saved}}};
export const Uncertain: Story = {args: {screen: {...ready, notice: householdRsvpCopy.uncertain}}};
export const Loading: Story = {parameters: {catchComponent: {id: "household_rsvp_view", routeIds: ["household_rsvp"], states: ["loading"]}}, args: {screen: {kind: "loading"}}};
export const Unavailable: Story = {parameters: {catchComponent: {id: "household_rsvp_view", routeIds: ["household_rsvp"], states: ["unavailable"]}}, args: {screen: {kind: "unavailable", reason: "invalid"}}};
export const NetworkError: Story = {args: {screen: {kind: "unavailable", reason: "network"}}};
