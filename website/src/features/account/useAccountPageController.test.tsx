import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {act, renderHook, waitFor} from "@testing-library/react";
import type {PropsWithChildren} from "react";
import {beforeEach, describe, expect, it, vi} from "vitest";
import type {User} from "../../firebase";
const api = vi.hoisted(() => ({watch: vi.fn(), read: vi.fn(), follow: vi.fn(), withdraw: vi.fn(), ticket: vi.fn(), signOut: vi.fn()}));
vi.mock("../../firebase", () => ({watchWebsiteAccountAuthState: api.watch, manageWebsiteAccount: api.read,
  beginWebsiteAccountPhoneVerification: vi.fn(), setWebsiteOrganizerFollow: api.follow,
  withdrawWebsiteMessagingPermission: api.withdraw, getWebsiteEventTicketCode: api.ticket, signOutWebsiteAccount: api.signOut}));
import {useAccountPageController} from "./useAccountPageController";

const user = {uid: "u", phoneNumber: "+919876543210"} as User;
const plan = {eventId: "e1", eventName: "10K", organizerId: "o", organizerName: "Run", startsAt: "2026-11-15T00:30:00.000Z",
  endsAt: null, venue: null, status: "signedUp" as const, timing: "upcoming" as const, passAvailable: true};
const account = {uid: "u", accountReady: true, displayName: "Ada", phoneNumber: user.phoneNumber, dateOfBirth: null,
  profileRevision: 2, following: null, eventAge: null, plans: [plan], follows: [], reviews: [],
  messages: [{organizerId: "o", organizerName: "Run", whatsapp: "optedIn" as const, sms: "unknown" as const, whatsappReceiptId: "r1"}]};
function harness(initial: User | null = user) {
  api.watch.mockImplementation((callback) => {callback(initial); return vi.fn();});
  const client = new QueryClient({defaultOptions: {queries: {retry: false}}});
  const wrapper = ({children}: PropsWithChildren) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return renderHook(() => useAccountPageController(), {wrapper});
}
beforeEach(() => {vi.clearAllMocks(); api.read.mockResolvedValue(account); window.history.replaceState(null, "", "/account/");});

describe("account page", () => {
  it("reads every section of the signed-in account in one request", async () => {
    const h = harness();
    await waitFor(() => expect(h.result.current.phase).toBe("ready"));
    expect(api.read).toHaveBeenCalledWith({action: "read", sections: ["plans", "following", "reviews", "messages"]});
  });
  it("offers sign-in without reading anything when signed out", async () => {
    const h = harness(null);
    await waitFor(() => expect(h.result.current.phase).toBe("signedOut"));
    expect(api.read).not.toHaveBeenCalled();
  });
  it("opens the pass a ?pass= link names once the plans arrive, and drops the parameter", async () => {
    api.ticket.mockResolvedValue({eventId: "e1", ticketCode: "T1"});
    window.history.replaceState(null, "", "/account/?pass=e1#plans");
    const h = harness();
    await waitFor(() => expect(h.result.current.pass?.state).toBe("ready"));
    expect(api.ticket).toHaveBeenCalledWith("e1");
    expect(window.location.search).toBe("");
    expect(window.location.hash).toBe("#plans");
  });
  it("ignores a ?pass= link for a plan without a pass", async () => {
    window.history.replaceState(null, "", "/account/?pass=missing#plans");
    const h = harness();
    await waitFor(() => expect(h.result.current.phase).toBe("ready"));
    expect(h.result.current.pass).toBeNull();
    expect(api.ticket).not.toHaveBeenCalled();
  });
  it("keeps the tab in the fragment", async () => {
    const h = harness();
    act(() => h.result.current.setTab("messages"));
    expect(h.result.current.tab).toBe("messages");
    expect(window.location.hash).toBe("#messages");
  });
  it("unfollows and withdraws WhatsApp through the existing commands, then rereads", async () => {
    const h = harness();
    await waitFor(() => expect(h.result.current.phase).toBe("ready"));
    await act(async () => h.result.current.unfollow("o"));
    expect(api.follow).toHaveBeenCalledWith("o", false, "u");
    await act(async () => h.result.current.stopWhatsapp(account.messages[0]));
    expect(api.withdraw).toHaveBeenCalledWith(expect.objectContaining({scope: "organizer", organizerId: "o", expectedReceiptId: "r1"}));
    expect(h.result.current.notice.tone).toBe("is-success");
    expect(api.read.mock.calls.length).toBeGreaterThanOrEqual(3);
  });
  it("opens the pass as the door's ticket payload", async () => {
    api.ticket.mockResolvedValue({eventId: "e1", attendeeId: "a1", ticketCode: "code.sig"});
    const h = harness();
    await act(async () => h.result.current.openPass(plan));
    expect(h.result.current.pass).toEqual({plan, state: "ready",
      payload: JSON.stringify({kind: "catch:event-ticket", v: 1, eventId: "e1", ticketCode: "code.sig"})});
  });
  it("saves details through account completion with the revision fence", async () => {
    const h = harness();
    await waitFor(() => expect(h.result.current.details.name).toBe("Ada"));
    act(() => {h.result.current.details.setName("Ada L"); h.result.current.details.setBirth("1990-01-01");});
    await act(async () => h.result.current.details.save());
    expect(api.read).toHaveBeenCalledWith({action: "complete", displayName: "Ada L", expectedUid: "u", expectedProfileRevision: 2,
      dateOfBirth: "1990-01-01"});
  });
});
