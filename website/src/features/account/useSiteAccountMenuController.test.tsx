import {act, renderHook, waitFor} from "@testing-library/react";
import {beforeEach, describe, expect, it, vi} from "vitest";
const api = vi.hoisted(() => ({read: vi.fn(), signOut: vi.fn()}));
vi.mock("../../firebase", () => ({manageWebsiteAccount: api.read, signOutWebsiteAccount: api.signOut}));
const rows = vi.hoisted(() => ({watch: vi.fn(), names: vi.fn()}));
vi.mock("../../firebaseReadModels", () => ({watchOwnAccountRows: rows.watch, readPublicOrganizers: rows.names}));
import {signedInHintKey} from "./signInModel";
import {useSiteAccountMenuController} from "./useSiteAccountMenuController";

/** One of the guest's own event rows, as guestEventStatuses holds it. */
const planRow = (eventId: string, startsAt: string, participationStatus: "signedUp" | "cancelled" = "signedUp") => ({
  id: `${eventId}_u`, data: {uid: "u", eventId, participationStatus, eventCard: {organizerId: "o", name: eventId,
    startTimeMillis: Date.parse(startsAt), endTimeMillis: null, meetingPoint: "Carter Road", status: "active"}}});
beforeEach(() => {
  vi.clearAllMocks(); window.localStorage.clear();
  rows.names.mockResolvedValue(new Map([["o", {name: "Run"}]]));
});

describe("site account menu", () => {
  it("reads identity, listens to the guest's own plans and offers the next plan that is still on", async () => {
    api.read.mockResolvedValue({uid: "u", displayName: "Aanya Mehta", phoneNumber: "+919876543210"});
    rows.watch.mockImplementation(async (_uid, onValue) => {
      onValue({plans: [planRow("later", "2090-11-21T14:00:00.000Z"), planRow("off", "2090-11-15T00:45:00.000Z", "cancelled")],
        follows: [], reviews: []});
      return vi.fn();
    });
    const h = renderHook(({signedIn}) => useSiteAccountMenuController(signedIn), {initialProps: {signedIn: true}});
    await waitFor(() => expect(h.result.current.summary?.next?.eventId).toBe("later"));
    expect(api.read).toHaveBeenCalledWith({action: "read"});
    expect(rows.watch).toHaveBeenCalledWith("u", expect.any(Function), expect.any(Function));
    expect(h.result.current.summary?.next).toMatchObject({organizerName: "Run", venue: "Carter Road"});
    expect(h.result.current.summary).toMatchObject({name: "Aanya Mehta", phoneNumber: "+919876543210", upcoming: 1});
    h.rerender({signedIn: false});
    expect(h.result.current.summary).toBeNull();
  });
  it("reads nothing signed out, and signs out without leaving the page", async () => {
    window.localStorage.setItem(signedInHintKey, "1");
    const h = renderHook(() => useSiteAccountMenuController(false));
    expect(api.read).not.toHaveBeenCalled();
    await act(async () => h.result.current.signOut());
    expect(api.signOut).toHaveBeenCalledOnce();
    expect(window.localStorage.getItem(signedInHintKey)).toBeNull();
  });
});
