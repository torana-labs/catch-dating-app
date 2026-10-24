import {ConsumerEventPage} from "../shared/ui/primitives/consumerEvent";
import type {Meta, StoryObj} from "@storybook/react-vite";
import {EventDetailHeroSection, EventDetailFactsSection} from "../features/events/sections/EventDetailSections";
import {catchEventDetailFixture} from "./fixtures/eventDetails";
import {demoEventId} from "./fixtures/demoWorld";
import {GuestEventEntryView} from "../features/events/GuestEventEntry";
const noop = () => undefined;
const controller = {user: null, phone: "", setPhone: noop, code: "", setCode: noop,
  codeSent: false, submit: async () => undefined, message: "", pending: false,
  recaptchaId: "preview", viewer: null, loading: false, error: false,
  refresh: async () => ({}), changePhone: noop, changeAccount: async () => undefined,
} as unknown as Parameters<typeof GuestEventEntryView>[0]["controller"];
const meta = {title: "Events/Guest entry", component: GuestEventEntryView,
  decorators: [(Story) => <ConsumerEventPage><Story /></ConsumerEventPage>],
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

const invitation = {title: catchEventDetailFixture.title, price: catchEventDetailFixture.priceLabel};
function invitationState(action?: string, extra = {}) {
  const value = action ? {...controller, user: {uid: "preview", phoneNumber: "+919000000000"},
    viewer: {guest: {action, expiresAtMillis: 9e12, ...extra}}} as typeof controller : controller;
  return <><EventDetailHeroSection event={catchEventDetailFixture}
    guestEntry={<GuestEventEntryView eventId={demoEventId} controller={value} invitation={invitation} />} />
    <EventDetailFactsSection event={catchEventDetailFixture} /></>;
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
export const SparseEvent: Story = {render: () => <><EventDetailHeroSection event={{...catchEventDetailFixture,
  photoUrl: null, itinerary: [], summary: "", accessibility: "", requirements: "", locationDetails: "", priceLabel: "Free"}} />
  <EventDetailFactsSection event={{...catchEventDetailFixture, itinerary: [], summary: "", accessibility: "", requirements: ""}} /></>};
