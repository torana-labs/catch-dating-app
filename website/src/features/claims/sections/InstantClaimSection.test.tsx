import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {act, cleanup, fireEvent, render, screen} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {hostListings} from "../../organizers/data";

const firebase = vi.hoisted(() => ({
  getOrganizerClaimVerificationOptions: vi.fn(),
  startOrganizerClaimVerification: vi.fn(),
  confirmOrganizerClaimVerification: vi.fn(),
  watchOrganizerClaimAttempt: vi.fn(),
}));
const account = vi.hoisted(() => ({ready: true, uid: "owner-1" as string | null}));

vi.mock("../../../analytics", () => ({trackMarketingEvent: vi.fn()}));
vi.mock("../../../firebase", () => firebase);
vi.mock("../../../firebaseConfig", () => ({claimFirebaseConfigured: true}));
vi.mock("../../account/useWebsiteAccountController", () => ({useWebsiteAccountController: () => account}));
vi.mock("../../account/accountForm", () => ({renderAccountForm: () => "account form"}));

import type {HostListing} from "../../organizers/types";
import {useInstantClaimController} from "../useInstantClaimController";
import {InstantClaimPanel} from "./InstantClaimSection";

function InstantClaimSection({listing}: {listing: HostListing}) {
  return <InstantClaimPanel controller={useInstantClaimController(listing.id)} listing={listing} />;
}

const listing = hostListings[0];
const inAnHour = new Date(Date.now() + 60 * 60 * 1000).toISOString();

function renderSection() {
  const client = new QueryClient({defaultOptions: {queries: {retry: false}, mutations: {retry: false}}});
  return render(<QueryClientProvider client={client}><InstantClaimSection listing={listing} /></QueryClientProvider>);
}

function options(instagram: boolean, luma: boolean) {
  return {organizerId: listing.id, catchInstagramHandle: "catch_dates", methods: [
    {method: "instagramMessage", available: instagram, proofTarget: instagram ? "carterroadrunners" : null,
      unavailableReason: instagram ? null : "noSourceOnListing"},
    {method: "lumaDescription", available: luma, proofTarget: luma ? "https://lu.ma/carter" : null,
      unavailableReason: luma ? null : "turnedOff"},
  ]};
}

afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  account.ready = true;
  account.uid = "owner-1";
});

describe("InstantClaimPanel", () => {
  it("asks for an account before it offers any check", () => {
    account.ready = false;
    renderSection();
    expect(screen.getByText("account form")).toBeTruthy();
    expect(firebase.getOrganizerClaimVerificationOptions).not.toHaveBeenCalled();
  });

  it("shows the Instagram code and follows the attempt to verified", async () => {
    firebase.getOrganizerClaimVerificationOptions.mockResolvedValue(options(true, true));
    firebase.startOrganizerClaimVerification.mockResolvedValue({attemptId: "a1", organizerId: listing.id,
      method: "instagramMessage", code: "482173", proofText: "482173", proofTarget: "carterroadrunners",
      catchInstagramHandle: "catch_dates", expiresAt: inAnHour});
    let push: (state: unknown) => void = () => undefined;
    firebase.watchOrganizerClaimAttempt.mockImplementation(async (_id, onValue) => {push = onValue; return vi.fn();});
    renderSection();

    expect(await screen.findByText("Send a code we show you from @carterroadrunners to @catch_dates")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", {name: "Show my code"}));
    expect(await screen.findByText("482 173")).toBeTruthy();
    expect(firebase.startOrganizerClaimVerification).toHaveBeenCalledWith({organizerId: listing.id, method: "instagramMessage"});
    expect(screen.getByText("1. Open Instagram as @carterroadrunners.")).toBeTruthy();
    expect(screen.getByRole("link", {name: "Open Instagram"}).getAttribute("href")).toBe("https://ig.me/m/catch_dates");

    await vi.waitFor(() => expect(firebase.watchOrganizerClaimAttempt).toHaveBeenCalled());
    act(() => push({status: "awaitingProof", expiresAtMillis: Date.parse(inAnHour), rejection: "wrongSender"}));
    expect(screen.getByText("That message came from a different Instagram account. Send the code from @carterroadrunners.")).toBeTruthy();
    act(() => push({status: "verified", expiresAtMillis: Date.parse(inAnHour), rejection: null}));
    expect(await screen.findByText("It’s yours.")).toBeTruthy();
  });

  it("checks the Luma calendar and says when the code is not there yet", async () => {
    firebase.getOrganizerClaimVerificationOptions.mockResolvedValue(options(false, true));
    firebase.startOrganizerClaimVerification.mockResolvedValue({attemptId: "a2", organizerId: listing.id,
      method: "lumaDescription", code: "482173", proofText: "catch-482173", proofTarget: "https://lu.ma/carter",
      catchInstagramHandle: null, expiresAt: inAnHour});
    firebase.confirmOrganizerClaimVerification
      .mockResolvedValueOnce({attemptId: "a2", status: "awaitingProof", claimRequestId: null, lastRejection: null})
      .mockResolvedValueOnce({attemptId: "a2", status: "verified", claimRequestId: "r1", lastRejection: null});
    renderSection();

    fireEvent.click(await screen.findByRole("button", {name: "Show my code"}));
    expect(await screen.findByText("catch-482173")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", {name: "Check my Luma page"}));
    expect(await screen.findByText(/couldn’t find the code on your Luma calendar/u)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", {name: "Check my Luma page"}));
    expect(await screen.findByText("It’s yours.")).toBeTruthy();
    expect(firebase.confirmOrganizerClaimVerification).toHaveBeenCalledWith({attemptId: "a2"});
  });

  it("points to staff review when no check works for the listing", async () => {
    firebase.getOrganizerClaimVerificationOptions.mockResolvedValue(options(false, false));
    renderSection();
    expect(await screen.findByText(/Ask for a review below instead/u)).toBeTruthy();
  });

  it("offers a new code once the attempt expires", async () => {
    firebase.getOrganizerClaimVerificationOptions.mockResolvedValue(options(true, false));
    firebase.startOrganizerClaimVerification.mockResolvedValue({attemptId: "a3", organizerId: listing.id,
      method: "instagramMessage", code: "111222", proofText: "111222", proofTarget: "carterroadrunners",
      catchInstagramHandle: "catch_dates", expiresAt: new Date(Date.now() - 1000).toISOString()});
    firebase.watchOrganizerClaimAttempt.mockResolvedValue(vi.fn());
    renderSection();
    fireEvent.click(await screen.findByRole("button", {name: "Show my code"}));
    expect(await screen.findByText("This code has expired. Show a new one to try again.")).toBeTruthy();
    expect(screen.getByRole("button", {name: "Show a new code"})).toBeTruthy();
  });
});
