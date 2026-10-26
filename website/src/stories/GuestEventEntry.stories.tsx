import {CatchBand, CatchSplit} from "@catch/web-ui";
import type {Meta, StoryObj} from "@storybook/react-vite";
import {buildEventPageView} from "../features/events/eventPageModel";
import {EventBookingCard} from "../features/events/sections/EventPageSections";
import {eventPageFixtureNow, fullEventPage} from "./fixtures/eventPages";
import {demoEventId} from "./fixtures/demoWorld";
import {GuestEventEntryView} from "../features/events/GuestEventEntry";
const noop = () => undefined;
const controller = {user: null, phone: "", setPhone: noop, code: "", setCode: noop,
  codeSent: false, submit: async () => undefined, message: "", pending: false,
  recaptchaId: "preview", viewer: null, loading: false, error: false,
  refresh: async () => ({}), changePhone: noop, changeAccount: async () => undefined,
} as unknown as Parameters<typeof GuestEventEntryView>[0]["controller"];
const meta = {title: "Events/Guest entry", component: GuestEventEntryView,
  parameters: {a11y: {test: "error"}},
  args: {eventId: demoEventId, controller},
} satisfies Meta<typeof GuestEventEntryView>;
export default meta;
type Story = StoryObj<typeof meta>;
export const GuestEntry: Story = {parameters: {
  catchComponent: {id: "event_guest_entry", routeIds: ["event_detail_canonical", "event_booking"],
    states: ["phone", "status", "unavailable"]}}};
export const GuestStatus: Story = {parameters: {
  catchComponent: {id: "event_guest_entry_view", routeIds: ["event_detail_canonical", "event_booking"],
    states: ["phone", "status", "unavailable"]}},
  args: {controller: {...controller, user: {uid: "preview", phoneNumber: "+919000000000"},
    viewer: {guest: {action: "applicationPending"}}} as typeof controller}};
export const Unavailable: Story = {args: {controller: {...controller,
  user: {uid: "preview", phoneNumber: "+919000000000"}, error: true} as typeof controller}};

// Each guest state in the event page's booking card.
const view = buildEventPageView(fullEventPage, eventPageFixtureNow);
const invitation = {title: view.title, price: view.priceLabel};
function invitationState(action?: string, extra = {}) {
  const value = action ? {...controller, user: {uid: "preview", phoneNumber: "+919000000000"},
    viewer: {guest: {action, expiresAtMillis: 9e12, ...extra}}} as typeof controller : controller;
  return <CatchBand as="main" pt="compact"><CatchSplit end={<EventBookingCard
    catchEntry={<GuestEventEntryView eventId={demoEventId} controller={value} invitation={invitation} />}
    externalAction={(button) => button} onExternalClick={noop} view={view} />} railSide="end" ratio="narrowRail" start={null} /></CatchBand>;
}
export const Invitation: Story = {render: () => invitationState()};
export const ApprovalRequired: Story = {render: () => invitationState("apply", {publicFormId: "preview-form"})};
export const ApprovalPending: Story = {render: () => invitationState("applicationPending")};
export const ApprovedAwaitingOffer: Story = {render: () => invitationState("awaitingOffer")};
export const OfferReady: Story = {render: () => invitationState("offer", {offerGrantId: "preview-grant"})};
export const SeatWaitlisted: Story = {render: () => invitationState("seatWaitlisted")};
export const ConfirmedWithRuntime: Story = {render: () => invitationState("registered", {runtimeId: "preview-runtime"})};
export const PaymentRecovery: Story = {render: () => invitationState("recoverPayment", {publicPaymentId: "preview-payment"})};
export const RegistrationClosed: Story = {render: () => invitationState("closed")};
