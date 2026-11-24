import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import type {PropsWithChildren} from "react";
import {cleanup, fireEvent, render, screen, waitFor} from "@testing-library/react";
import {afterEach, beforeEach, expect, it, vi} from "vitest";
const api = vi.hoisted(() => ({begin: vi.fn(), register: vi.fn(), confirm: vi.fn(), clear: vi.fn(), watch: vi.fn(), account: vi.fn()}));
vi.mock("../../firebase", () => ({beginPublicEventPhoneVerification: api.begin,
  registerPublicEvent: api.register, watchPublicFormAuthState: api.watch,
  watchWebsiteAccountAuthState: api.watch, manageWebsiteAccount: api.account}));
vi.mock("../eventMessaging/EventSmsPreferencePanel", () => ({
  EventSmsPreferencePanel: ({eventId, attendeeId}: {eventId: string; attendeeId: string}) =>
    <section aria-label="Event text preferences">{eventId}:{attendeeId}</section>,
}));
vi.mock("../eventMessaging/EventRcsPreferencesPanel", () => ({
  EventRcsPreferencesPanel: ({eventId, attendeeId}: {eventId: string; attendeeId: string}) =>
    <section aria-label="Event RCS preferences">{eventId}:{attendeeId}</section>,
}));
vi.mock("../eventMessaging/EventWhatsappPreferencesPanel", () => ({
  EventWhatsappPreferencesPanel: ({eventId, attendeeId}: {eventId: string; attendeeId: string}) =>
    <section aria-label="Event WhatsApp preferences">{eventId}:{attendeeId}</section>,
}));
import {PublicEventRegistration} from "./PublicEventRegistration";
import {eventDetailCopy} from "../../content/events";
const copy = eventDetailCopy.hero.webRegistration;
afterEach(cleanup);
let client: QueryClient;
function wrapper({children}: PropsWithChildren) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
beforeEach(() => {
  client = new QueryClient({defaultOptions: {queries: {retry: false}}});
  vi.clearAllMocks();
  api.begin.mockResolvedValue({confirm: api.confirm, clear: api.clear});
  api.confirm.mockResolvedValue({uid: "guest", phoneNumber: "+919999999999"});
  api.account.mockResolvedValue({uid: "guest", accountReady: true, displayName: "Fixture Guest", phoneNumber: "+919999999999", profileRevision: 1, dateOfBirth: null, eventAge: null});
  api.watch.mockImplementation((next) => { next({uid: "guest", phoneNumber: "+919999999999"}); return () => undefined; });
});
async function register() {
  render(<PublicEventRegistration eventId="event-1" />, {wrapper});
  expect(screen.queryByRole("region", {name: "Event text preferences"})).toBeNull();
  expect(screen.queryByRole("region", {name: "Event RCS preferences"})).toBeNull();
  expect(screen.queryByRole("region", {name: "Event WhatsApp preferences"})).toBeNull();
  const name = await screen.findByLabelText(copy.nameLabel) as HTMLInputElement;
  expect(name.value).toBe("Fixture Guest");
  expect((screen.getByLabelText(copy.phoneLabel) as HTMLInputElement).value).toBe("9999999999");
  fireEvent.click(screen.getByRole("button", {name: copy.registerAction}));
  await waitFor(() => expect(api.register).toHaveBeenCalledOnce());
}
it.each(["registered", "alreadyRegistered"])("offers separate event texts after %s", async (status) => {
  api.register.mockResolvedValue({eventId: "event-1", attendeeId: "verified-guest", status});
  await register();
  expect((await screen.findByRole("region", {name: "Event text preferences"})).textContent)
    .toBe("event-1:verified-guest");
  expect((await screen.findByRole("region", {name: "Event RCS preferences"})).textContent)
    .toBe("event-1:verified-guest");
  expect((await screen.findByRole("region", {name: "Event WhatsApp preferences"})).textContent)
    .toBe("event-1:verified-guest");
  expect(api.register.mock.calls[0][0].organizerUpdates)
    .toEqual({whatsapp: false, sms: false, termsVersion: "organizer-updates-v1"});
});
it("does not offer event-service texts for a waitlist place", async () => {
  api.register.mockResolvedValue({eventId: "event-1", attendeeId: "waitlisted", status: "waitlisted"});
  await register();
  await screen.findByText(copy.waitlisted);
  expect(screen.queryByRole("region", {name: "Event text preferences"})).toBeNull();
  expect(screen.queryByRole("region", {name: "Event RCS preferences"})).toBeNull();
  expect(screen.queryByRole("region", {name: "Event WhatsApp preferences"})).toBeNull();
});

it("offers minimal inline onboarding without social fields", async () => {
  api.account.mockResolvedValue({uid: "guest", accountReady: false, displayName: "", phoneNumber: "+919999999999", profileRevision: 0, dateOfBirth: null, eventAge: null});
  render(<PublicEventRegistration eventId="event-1" />, {wrapper});
  expect(await screen.findByLabelText("Date of birth (optional)")).toBeTruthy();
  expect(screen.getByLabelText("Name")).toBeTruthy();
  expect(screen.queryByLabelText(/photo|gender|interested/iu)).toBeNull();
  expect(api.register).not.toHaveBeenCalled();
});
it("requires birth date when the current event has an age restriction", async () => {
  api.account.mockResolvedValue({uid: "guest", accountReady: true, displayName: "Fixture Guest", phoneNumber: "+919999999999", profileRevision: 1, dateOfBirth: null, eventAge: {minimum: 18, maximum: 99, needsDateOfBirth: true, eligible: false}});
  render(<PublicEventRegistration eventId="event-1" />, {wrapper});
  expect(await screen.findByLabelText("Date of birth — required for this event")).toBeTruthy();
  expect(api.register).not.toHaveBeenCalled();
});

it("carries the terms line on the account step and no separate ad notice", async () => {
  api.account.mockResolvedValue({uid: "guest", accountReady: false, displayName: "", phoneNumber: "+919999999999", profileRevision: 0, dateOfBirth: null, eventAge: null});
  render(<PublicEventRegistration eventId="event-1" />, {wrapper});
  expect((await screen.findByRole("link", {name: "terms"})).getAttribute("href")).toBe("/terms/");
  expect(screen.getByRole("link", {name: "privacy policy"}).getAttribute("href")).toBe("/privacy/");
  expect(screen.queryByText(/Google and Meta/u)).toBeNull();
});
it("shows no ad notice by the register button and no longer says booking data is not for advertising", async () => {
  render(<PublicEventRegistration eventId="event-1" />, {wrapper});
  await screen.findByLabelText(copy.nameLabel);
  expect(screen.queryByText(/Google and Meta/u)).toBeNull();
  expect(screen.queryByText(/not permission for advertising/iu)).toBeNull();
});
