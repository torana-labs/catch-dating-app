import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {act, renderHook, waitFor} from "@testing-library/react";
import type {PropsWithChildren} from "react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
const getView = vi.hoisted(() => vi.fn());
const submitRsvp = vi.hoisted(() => vi.fn());
vi.mock("../../firebase", () => ({
  getProgramHouseholdRsvpView: getView,
  submitProgramHouseholdRsvp: submitRsvp,
}));
import {useHouseholdRsvpController} from "./useHouseholdRsvpController";
import {householdRsvpViewFixture} from "../../content/householdRsvp";
import {draftFor, draftsFromView, householdRsvpCredential,
  householdRsvpOnwardLinks, travelDraftFor} from "./householdRsvpModel";
import type {ProgramHouseholdRsvpViewCallableResponse} from "../../shared/contracts/generated/programHouseholdRsvpViewCallableResponse";
const view: ProgramHouseholdRsvpViewCallableResponse = householdRsvpViewFixture;

const token = "cHJvZ3JhbUlkLXBhY2thZ2UtcGF5bG9hZA.c2lnbmF0dXJlLXBhcnQ";
const credential = {token};

function harness(input: typeof credential | null = credential) {
  const client = new QueryClient({defaultOptions: {queries: {retry: false}}});
  const wrapper = ({children}: PropsWithChildren) =>
    <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return {...renderHook(() => useHouseholdRsvpController(input), {wrapper}),
    client};
}

describe("household RSVP controller", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getView.mockResolvedValue(view);
    submitRsvp.mockResolvedValue({
      entityId: "fixture-household", revision: 2, appliedCount: 2,
      messagingConsentGranted: true, alreadyApplied: false,
    });
  });
  afterEach(() => vi.restoreAllMocks());

  it("accepts only well-formed path tokens as credentials", () => {
    expect(householdRsvpCredential(token)).toEqual(credential);
    expect(householdRsvpCredential(undefined)).toBeNull();
    expect(householdRsvpCredential("short")).toBeNull();
    expect(householdRsvpCredential("no-dot-but-long-enough-value")).toBeNull();
    expect(householdRsvpCredential("has space.init")).toBeNull();
  });

  it("does not call an endpoint for a missing credential", () => {
    const h = harness(null);
    expect(h.result.current.screen)
      .toEqual({kind: "unavailable", reason: "invalid"});
    expect(getView).not.toHaveBeenCalled();
    h.unmount();
  });

  it("seeds drafts from the view and stays clean until edited", async () => {
    const h = harness();
    await waitFor(() =>
      expect(h.result.current.screen.kind).toBe("ready"));
    const screen = h.result.current.screen;
    if (screen.kind !== "ready") throw new Error("expected ready");
    expect(screen.dirty).toBe(false);
    expect(draftFor(screen.drafts, "fixture-guest-1", "fixture-sangeet"))
      .toMatchObject({rsvpStatus: "pending"});
    expect(draftFor(screen.drafts, "fixture-guest-1", "fixture-reception"))
      .toMatchObject({rsvpStatus: "attending", partySize: 2});
    expect(getView).toHaveBeenCalledWith(credential);
    h.unmount();
  });

  it("submits the full draft map with the explicit consent flag", async () => {
    const h = harness();
    await waitFor(() =>
      expect(h.result.current.screen.kind).toBe("ready"));
    // Refetches after submit echo the confirmed edits.
    getView.mockResolvedValue({
      ...view,
      messagingConsentGranted: true,
      members: view.members.map((member) => ({
        ...member,
        functions: member.functions.map((fn) =>
          member.guestId === "fixture-guest-1" &&
            fn.functionId === "fixture-sangeet" ?
            {...fn, rsvpStatus: "attending" as const, partySize: 3} : fn),
      })),
    });
    act(() => {
      h.result.current.setResponse(
        "fixture-guest-1", "fixture-sangeet", {rsvpStatus: "attending",
          partySize: 3});
      h.result.current.setConsent(true);
    });
    let screen = h.result.current.screen;
    if (screen.kind !== "ready") throw new Error("expected ready");
    expect(screen.dirty).toBe(true);
    act(() => { h.result.current.submit(); h.result.current.submit(); });
    await waitFor(() => {
      const next = h.result.current.screen;
      expect(next.kind === "ready" && next.submitted).toBe(true);
    });
    expect(submitRsvp).toHaveBeenCalledTimes(1);
    expect(submitRsvp).toHaveBeenCalledWith({
      token,
      messagingConsent: true,
      travel: [],
      responses: expect.arrayContaining([
        expect.objectContaining({
          guestId: "fixture-guest-1", functionId: "fixture-sangeet",
          rsvpStatus: "attending", partySize: 3}),
      ]),
    });
    screen = h.result.current.screen;
    if (screen.kind !== "ready") throw new Error("expected ready");
    expect(screen.dirty).toBe(false);
    h.unmount();
  });

  it("does not submit when nothing changed", async () => {
    const h = harness();
    await waitFor(() =>
      expect(h.result.current.screen.kind).toBe("ready"));
    act(() => { h.result.current.submit(); });
    expect(submitRsvp).not.toHaveBeenCalled();
    h.unmount();
  });

  it("re-seeds drafts after a manual refresh", async () => {
    const h = harness();
    await waitFor(() =>
      expect(h.result.current.screen.kind).toBe("ready"));
    act(() => {
      h.result.current.setResponse(
        "fixture-guest-1", "fixture-sangeet", {rsvpStatus: "declined"});
    });
    let screen = h.result.current.screen;
    if (screen.kind !== "ready") throw new Error("expected ready");
    expect(screen.dirty).toBe(true);
    act(() => { h.result.current.refresh(); });
    await waitFor(() => {
      const next = h.result.current.screen;
      expect(next.kind === "ready" && !next.dirty).toBe(true);
    });
    screen = h.result.current.screen;
    if (screen.kind !== "ready") throw new Error("expected ready");
    expect(draftFor(screen.drafts, "fixture-guest-1", "fixture-sangeet"))
      .toMatchObject({rsvpStatus: "pending"});
    h.unmount();
  });

  it("seeds travel drafts from echoed legs and stays clean", async () => {
    const h = harness();
    await waitFor(() =>
      expect(h.result.current.screen.kind).toBe("ready"));
    const screen = h.result.current.screen;
    if (screen.kind !== "ready") throw new Error("expected ready");
    expect(screen.dirty).toBe(false);
    expect(travelDraftFor(screen.travelDrafts,
      "fixture-guest-1", "inbound")).toMatchObject({
      flightNumber: "AI 610", destinationHotelId: "fixture-hotel-1",
      passengers: 2, luggageUnits: 3});
    expect(travelDraftFor(screen.travelDrafts,
      "fixture-guest-1", "outbound")).toBeUndefined();
    h.unmount();
  });

  it("submits only changed non-empty travel blocks", async () => {
    const h = harness();
    await waitFor(() =>
      expect(h.result.current.screen.kind).toBe("ready"));
    act(() => {
      h.result.current.setTravel("fixture-guest-2", "inbound", {
        scheduledArrivalAtMillis: 1_800_505_000_000,
        destinationHotelId: "fixture-hotel-2",
      });
      // Identical re-entry of the seeded echo does not churn a resend.
      h.result.current.setTravel("fixture-guest-1", "inbound", {
        flightNumber: "AI 610", carrierCode: "AI", originIata: "BOM",
        destinationIata: "JAI",
        scheduledArrivalAtMillis: 1_800_500_000_000,
        destinationHotelId: "fixture-hotel-1", destinationLabel: null,
        passengers: 2, luggageUnits: 3});
    });
    act(() => { h.result.current.submit(); });
    await waitFor(() => expect(submitRsvp).toHaveBeenCalled());
    expect(submitRsvp).toHaveBeenCalledWith(expect.objectContaining({
      travel: [
        expect.objectContaining({
          guestId: "fixture-guest-2", kind: "inbound",
          scheduledArrivalAtMillis: 1_800_505_000_000,
          destinationHotelId: "fixture-hotel-2"}),
      ],
    }));
    h.unmount();
  });

  it("does not stay dirty for a fully cleared travel block", async () => {
    const h = harness();
    await waitFor(() =>
      expect(h.result.current.screen.kind).toBe("ready"));
    act(() => {
      // An empty block has no delete semantics on the server, so it must
      // not hold the form dirty forever.
      h.result.current.setTravel("fixture-guest-1", "inbound", {
        flightNumber: null, carrierCode: null, originIata: null,
        destinationIata: null, scheduledArrivalAtMillis: null,
        destinationHotelId: null, destinationLabel: null,
        passengers: null, luggageUnits: null});
    });
    const screen = h.result.current.screen;
    if (screen.kind !== "ready") throw new Error("expected ready");
    expect(screen.dirty).toBe(false);
    act(() => { h.result.current.submit(); });
    expect(submitRsvp).not.toHaveBeenCalled();
    h.unmount();
  });

  it("maps unauthenticated errors to the unavailable state", async () => {
    getView.mockRejectedValueOnce(
      Object.assign(new Error("nope"), {code: "functions/unauthenticated"}));
    const h = harness();
    await waitFor(() =>
      expect(h.result.current.screen)
        .toEqual({kind: "unavailable", reason: "invalid"}));
    h.unmount();
  });

  it("links on to the weekend after a reply and to IDs when the programme collects them", () => {
    const pending = {...householdRsvpViewFixture, members: householdRsvpViewFixture.members.map((member) => ({
      ...member, functions: member.functions.map((fn) => ({...fn, rsvpStatus: "pending" as const}))}))};
    expect(householdRsvpOnwardLinks(pending, false, "tok.sig")).toEqual({itinerary: null, ids: null});
    expect(householdRsvpOnwardLinks(pending, true, "tok.sig")).toEqual({itinerary: "/itinerary/tok.sig/", ids: null});
    expect(householdRsvpOnwardLinks(householdRsvpViewFixture, false, "tok.sig").itinerary).toBe("/itinerary/tok.sig/");
    expect(householdRsvpOnwardLinks({...pending, collectsGuestIds: true}, false, "tok.sig"))
      .toEqual({itinerary: null, ids: "/ids/tok.sig/"});
    expect(householdRsvpOnwardLinks(householdRsvpViewFixture, true, null)).toEqual({itinerary: null, ids: null});
  });
});
