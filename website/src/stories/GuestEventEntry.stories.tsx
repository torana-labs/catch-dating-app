import {CatchBand, CatchGrid} from "@catch/web-ui";
import type {Meta, StoryObj} from "@storybook/react-vite";
import type {ReactNode} from "react";
import {expect, within} from "storybook/test";
import {buildEventPageView} from "../features/events/eventPageModel";
import {GuestEventEntryView} from "../features/events/GuestEventEntry";
import {PublicPaidRegistrationView} from "../features/events/PublicPaidEventRegistration";
import {EventBookingCard} from "../features/events/sections/EventPageSections";
import {demoEventId} from "./fixtures/demoWorld";
import {eventPageFixtureNow, fullEventPage} from "./fixtures/eventPages";

type Controller = Parameters<typeof GuestEventEntryView>[0]["controller"];
type Checkout = Parameters<typeof PublicPaidRegistrationView>[0];
const noop = () => undefined;
const controller = {user: null, phone: "", setPhone: noop, code: "", setCode: noop,
  codeSent: false, submit: async () => undefined, message: "", pending: false,
  recaptchaId: "preview", viewer: null, loading: false, error: false,
  refresh: async () => ({}), changePhone: noop, changeAccount: async () => undefined,
} as unknown as Controller;
const signedIn = (action: string, extra = {}) => ({...controller, user: {uid: "preview", phoneNumber: "+919000000000"},
  viewer: {guest: {action, expiresAtMillis: 9e12, ...extra}}}) as unknown as Controller;

const meta = {title: "Events/Booking steps", component: GuestEventEntryView,
  parameters: {a11y: {test: "error"}},
  args: {eventId: demoEventId, controller, startLabel: "Book now"},
} satisfies Meta<typeof GuestEventEntryView>;
export default meta;
type Story = StoryObj<typeof meta>;

// Each step in the event page's booking card, as the sticky aside or the phone sheet shows it.
const view = buildEventPageView(fullEventPage, eventPageFixtureNow);
function InCard({children}: {children: ReactNode}) {
  return <EventBookingCard catchEntry={children} onExternalClick={noop} view={view} />;
}
const start = Date.parse(fullEventPage.item.event.startTime);
const checkout = {allowNewBookings: true, phase: "ready", phone: "+919000000000", setPhone: noop, code: "", setCode: noop,
  name: "Asha", nameLocked: false, setName: noop, previousPayment: null, payment: null, admission: null, pending: false,
  user: {uid: "preview", phoneNumber: "+919000000000"}, status: {message: "", tone: ""}, recaptchaId: "preview-paid",
  quote: {eventId: demoEventId, eventName: view.title, amountPaise: 29_900, startTimeMillis: start,
    cancellationPolicy: {refundDeadlineMillis: start - 24 * 3_600_000}},
  sendCode: noop, verifyCode: noop, changePhone: noop, pay: noop, check: noop, load: noop, startAgain: noop,
  cancellationReview: null, reviewCancellation: noop, cancelAdmission: noop, dismissCancellation: noop,
} as unknown as Checkout;

/** Start, phone, code, then the paid checkout's review and its Razorpay payment. */
export const Steps: Story = {
  parameters: {catchComponent: {id: "event_guest_entry", routeIds: ["event_detail_canonical", "event_booking"],
    states: ["start", "phone", "code", "paid-review"]}},
  render: () => (
    <CatchBand as="main" pt="compact">
      <CatchGrid columns={4} compactColumns={1}>
        <InCard><GuestEventEntryView controller={controller} eventId={demoEventId} startLabel="Book now" /></InCard>
        <InCard><GuestEventEntryView controller={{...controller, phone: "+91 98765 43210"}} eventId={demoEventId} /></InCard>
        <InCard><GuestEventEntryView controller={{...controller, codeSent: true, phone: "+91 98765 43210", code: "1234"}}
          eventId={demoEventId} /></InCard>
        <InCard><PublicPaidRegistrationView {...checkout} /></InCard>
      </CatchGrid>
    </CatchBand>
  ),
  play: async ({canvasElement}) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("button", {name: "Book now"})).toBeVisible();
    await expect(canvas.getByRole("button", {name: "Verify phone"})).toBeVisible();
    await expect(canvas.getByRole("button", {name: "Reserve a seat and pay ₹299.00"})).toBeVisible();
    await expect(canvas.getByText("Secure payment by Razorpay.")).toBeVisible();
  },
};

/** The server's answer for a signed-in guest who cannot book here, and a booked guest's next step. */
export const GuestStates: Story = {
  parameters: {catchComponent: {id: "event_guest_entry_view", routeIds: ["event_detail_canonical", "event_booking"],
    states: ["status", "unavailable", "booked"]}},
  render: () => (
    <CatchBand as="main" pt="compact">
      <CatchGrid columns={4} compactColumns={1}>
        {[signedIn("apply", {publicFormId: "preview-form"}), signedIn("applicationPending"),
          signedIn("awaitingOffer"), signedIn("offer", {offerGrantId: "preview-grant"}), signedIn("seatWaitlisted"),
          signedIn("recoverPayment", {publicPaymentId: "preview-payment"}), signedIn("closed"),
          {...signedIn("closed"), error: true} as Controller,
          signedIn("registered", {runtimeId: "preview-runtime"})].map((value, index) => (
          <InCard key={index}><GuestEventEntryView controller={value} eventId={demoEventId} startLabel="Book now" /></InCard>
        ))}
      </CatchGrid>
    </CatchBand>
  ),
  play: async ({canvasElement}) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("link", {name: "Prepare for your event"})).toHaveAttribute("href", "/join/preview-runtime");
    await expect(canvas.queryByRole("button", {name: "Book now"})).toBeNull();
  },
};
