import {cleanup, render, screen} from "@testing-library/react";
import {afterEach, expect, it, vi} from "vitest";
vi.mock("../../firebase", () => ({}));
vi.mock("../eventMessaging/EventSmsPreferencePanel", () => ({EventSmsPreferencePanel: () => null}));
vi.mock("../eventMessaging/EventRcsPreferencesPanel", () => ({EventRcsPreferencesPanel: () => null}));
vi.mock("../eventMessaging/EventWhatsappPreferencesPanel", () => ({EventWhatsappPreferencesPanel: () => null}));
import {PublicPaidRegistrationView} from "./PublicPaidEventRegistration";
import type {usePublicCheckoutController} from "./usePublicCheckoutController";

afterEach(cleanup);

const empty = () => undefined;
const startMillis = Date.UTC(2026, 11, 5, 14, 0);
const checkout: ReturnType<typeof usePublicCheckoutController> = {
  allowNewBookings: true, phase: "ready", phone: "+91 98765 43210", setPhone: empty, code: "", setCode: empty,
  nameLocked: false, name: "Fixture Guest", setName: empty, user: null,
  places: 1, placesLeft: null, changePlaces: async () => undefined, guestNames: [], setGuestName: empty,
  quote: {eventId: "event-1", eventName: "Fixture quiz night", registrationRevision: 1,
    cancellationPolicy: {refundDeadlineMillis: startMillis - 86_400_000, eventStartsAtMillis: startMillis},
    startTimeMillis: startMillis, amountPaise: 85000, currency: "INR"},
  payment: null, previousPayment: null, admission: null, pending: false, status: {message: "", tone: ""}, recaptchaId: "test-public-otp",
  sendCode: async () => undefined, verifyCode: async () => undefined, changePhone: empty,
  cancellationReview: null, reviewCancellation: async () => undefined,
  cancelAdmission: async () => undefined, dismissCancellation: empty,
  startAgain: async () => undefined, pay: async () => undefined, check: async () => undefined, load: async () => undefined,
};

it("shows no ad notice under the pay button", () => {
  render(<PublicPaidRegistrationView {...checkout} />);
  expect(screen.getByRole("button", {name: /pay/iu})).toBeTruthy();
  expect(screen.queryByText(/Google and Meta/u)).toBeNull();
});
