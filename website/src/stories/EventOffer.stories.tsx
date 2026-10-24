import {useState} from "react";
import type {Meta, StoryObj} from "@storybook/react-vite";
import {EventOfferView} from "../features/eventOffers/EventOfferPage";
import type {useOfferCheckoutController} from "../features/eventOffers/useOfferCheckoutController";
import {demoEventId, demoEventName, eventTimesMillis, viewerGuest} from "./fixtures/demoWorld";
const meta = {title: "Marketing Website/Event invitation"} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
const empty = () => undefined;
const {startMillis} = eventTimesMillis(demoEventId);
// The world's trivia night is free; the paid states add a price.
const amountPaise = 85000;
const fixture: ReturnType<typeof useOfferCheckoutController> = {
  hasInvitation: true, phase: "ready", phone: "+91 98765 43210", setPhone: empty, code: "", setCode: empty,
  grant: {grantId: "a".repeat(64), eventId: demoEventId, eventName: demoEventName,
    cancellationPolicy: {refundDeadlineMillis: startMillis - 86_400_000, eventStartsAtMillis: startMillis},
    startTimeMillis: startMillis, amountPaise, currency: "INR", expiresAtMillis: 9e12},
  payment: null, admission: undefined, pending: false, status: {message: "", tone: ""}, recaptchaId: "preview-otp",
  sendCode: async () => undefined, verifyCode: async () => undefined, changePhone: empty,
  cancellationReview: null, reviewCancellation: async () => undefined,
  cancelAdmission: async () => undefined, dismissCancellation: empty,
  pay: async () => undefined, check: async () => undefined, load: async () => undefined,
};
const payment = {paymentId: `ep_${"a".repeat(32)}`, status: "verifying" as const,
  amountPaise, currency: "INR" as const, mode: "test" as const,
  refundedAmountPaise: 0, cancellationReason: null, cancellationPolicy: fixture.grant!.cancellationPolicy, cancellationQuote: null, expiresAtMillis: 9e12, checkout: null};
export const EventOffer: Story = {parameters: {
  catchRoute: {id: "event_offer", path: "/offer/", reviewStates: ["phone", "otp", "ready", "pending", "admitted", "refund", "unavailable"],
    stateCoverage: {storybook: ["phone", "otp", "ready", "pending", "admitted", "refund", "unavailable"], manual: []}},
  catchComponent: {id: "route_event_offer", routeIds: ["event_offer"], states: ["phone", "otp", "ready", "pending", "admitted", "refund", "unavailable"]}},
render: () => <EventOfferView {...fixture} />};
export const Invitation: Story = {parameters: {catchComponent: {id: "event_offer_view",
  routeIds: ["event_offer"], states: ["phone", "otp", "ready", "pending", "admitted", "refund", "unavailable"]}}, render: () => <EventOfferView {...fixture} />};
export const Phone: Story = {render: function PhonePreview() {
  const [phase, setPhase] = useState<"phone" | "otp" | "ready">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  return <EventOfferView {...fixture} grant={phase === "ready" ? fixture.grant : null}
    phase={phase} phone={phone} setPhone={setPhone} code={code} setCode={setCode}
    sendCode={async (event) => {event.preventDefault(); setPhase("otp");}}
    verifyCode={async (event) => {event.preventDefault(); setPhase("ready");}}
    changePhone={() => setPhase("phone")} />;
}};
export const Otp: Story = {render: () => <EventOfferView {...fixture} grant={null} phase="otp" />};
export const Pending: Story = {render: () => <EventOfferView {...fixture} payment={payment} />};
export const Admitted: Story = {render: () => <EventOfferView {...fixture} payment={{...payment, status: "admitted"}} />};
export const Refund: Story = {render: () => <EventOfferView {...fixture} payment={{...payment, status: "refundPending"}} />};
export const Cancelled: Story = {render: () => <EventOfferView {...fixture} payment={{...payment,
  status: "refundPending", cancellationReason: "eventCancelled"}} />};
export const Unavailable: Story = {render: () => <EventOfferView {...fixture} grant={null} phase="unavailable" />};

export const CancellationReview: Story = {render: () => <EventOfferView {...fixture} grant={null}
  payment={{...payment, status: "admitted", cancellationQuote: {refundAmountPaise: amountPaise}}}
  cancellationReview={{paymentId: payment.paymentId, refundAmountPaise: amountPaise}} />};
export const NoRefundReview: Story = {render: () => <EventOfferView {...fixture} grant={null}
  payment={{...payment, status: "admitted", cancellationQuote: {refundAmountPaise: 0}}}
  cancellationReview={{paymentId: payment.paymentId, refundAmountPaise: 0}} />};
export const GuestCancelled: Story = {render: () => <EventOfferView {...fixture} grant={null}
  payment={{...payment, status: "cancelled", cancellationReason: "guestCancelled"}} />};

export const FreeInvitation: Story = {render: () => <EventOfferView {...fixture}
  grant={{...fixture.grant!, amountPaise: 0, freeAdmission: {
    expectedOfferGeneration: 1, expectedOfferRevision: 2, expectedLedgerRevision: 3}}} />};
export const FreeAdmission: Story = {render: () => <EventOfferView {...fixture} grant={null}
  admission={{eventId: demoEventId, attendeeId: viewerGuest(demoEventId).personId}} />};
