import {act, renderHook, waitFor} from "@testing-library/react";
import {beforeEach, describe, expect, it, vi} from "vitest";
const api = vi.hoisted(() => ({read: vi.fn(), signOut: vi.fn()}));
vi.mock("../../firebase", () => ({manageWebsiteAccount: api.read, signOutWebsiteAccount: api.signOut}));
import {signedInHintKey} from "./signInModel";
import {useSiteAccountMenuController} from "./useSiteAccountMenuController";

const plan = (eventId: string, startsAt: string, status: "signedUp" | "cancelled" = "signedUp") => ({eventId, eventName: eventId,
  organizerId: "o", organizerName: "Run", startsAt, endsAt: null, venue: "Carter Road", status, timing: "upcoming" as const, passAvailable: true});
beforeEach(() => {vi.clearAllMocks(); window.localStorage.clear();});

describe("site account menu", () => {
  it("reads only the plans section while signed in and offers the next plan that is still on", async () => {
    api.read.mockResolvedValue({uid: "u", displayName: "Aanya Mehta", phoneNumber: "+919876543210",
      plans: [plan("later", "2026-11-21T14:00:00.000Z"), plan("off", "2026-11-15T00:45:00.000Z", "cancelled")]});
    const h = renderHook(({signedIn}) => useSiteAccountMenuController(signedIn), {initialProps: {signedIn: true}});
    await waitFor(() => expect(h.result.current.summary?.next?.eventId).toBe("later"));
    expect(api.read).toHaveBeenCalledWith({action: "read", sections: ["plans"]});
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
