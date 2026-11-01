import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {brand} from "@catch/brand";
import {act, cleanup, fireEvent, render, screen} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {hostListings} from "../../organizers/data";

const firebase = vi.hoisted(() => ({
  requestOrganizerClaim: vi.fn(),
  getOrganizerClaimVerificationOptions: vi.fn(),
  startOrganizerClaimVerification: vi.fn(),
  confirmOrganizerClaimVerification: vi.fn(),
  watchOrganizerClaimAttempt: vi.fn(),
}));
const account = vi.hoisted(() => ({ready: true, uid: "owner-1" as string | null,
  account: {displayName: "Asha Rao", phoneNumber: "+919800000000"}}));
const accountForm = vi.hoisted(() => vi.fn((_account: unknown, _options?: unknown) => "account form"));

vi.mock("../../../analytics", () => ({trackMarketingEvent: vi.fn()}));
vi.mock("../../../firebase", () => firebase);
vi.mock("../../../firebaseConfig", () => ({claimFirebaseConfigured: true}));
vi.mock("../../account/useWebsiteAccountController", () => ({useWebsiteAccountController: () => account}));
vi.mock("../../account/accountForm", () => ({renderAccountForm: accountForm}));

import type {HostListing} from "../../organizers/types";
import {useInstantClaimController} from "../useInstantClaimController";
import {InstantClaimPanel} from "./InstantClaimSection";

function InstantClaimSection({listing, pendingReview}: {listing: HostListing; pendingReview?: boolean}) {
  return <InstantClaimPanel controller={useInstantClaimController(listing.id)} listing={listing}
    pendingReview={pendingReview} />;
}

const listing = hostListings[0];
const inAnHour = new Date(Date.now() + 60 * 60 * 1000).toISOString();

function renderSection(pendingReview = false) {
  const client = new QueryClient({defaultOptions: {queries: {retry: false}, mutations: {retry: false}}});
  return render(<QueryClientProvider client={client}>
    <InstantClaimSection listing={listing} pendingReview={pendingReview} /></QueryClientProvider>);
}

function options(instagram: boolean, luma: boolean) {
  return {organizerId: listing.id, catchInstagramHandle: brand.social.instagramHandle, methods: [
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
  it("asks for a phone account, without a birth date, before it offers any check", () => {
    account.ready = false;
    renderSection();
    expect(screen.getByText("account form")).toBeTruthy();
    expect(accountForm).toHaveBeenCalledWith(account, {askBirthDate: false});
    expect(firebase.getOrganizerClaimVerificationOptions).not.toHaveBeenCalled();
  });

  it("shows the Instagram code and follows the attempt to verified", async () => {
    firebase.getOrganizerClaimVerificationOptions.mockResolvedValue(options(true, true));
    firebase.startOrganizerClaimVerification.mockResolvedValue({attemptId: "a1", organizerId: listing.id,
      method: "instagramMessage", code: "482173", proofText: "482173", proofTarget: "carterroadrunners",
      catchInstagramHandle: brand.social.instagramHandle, expiresAt: inAnHour});
    let push: (state: unknown) => void = () => undefined;
    firebase.watchOrganizerClaimAttempt.mockImplementation(async (_id, onValue) => {push = onValue; return vi.fn();});
    renderSection();

    expect(await screen.findByText(`Send a code we show you from @carterroadrunners to @${brand.social.instagramHandle}`)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", {name: "Show my code"}));
    expect(await screen.findByText("482 173")).toBeTruthy();
    expect(firebase.startOrganizerClaimVerification).toHaveBeenCalledWith({organizerId: listing.id, method: "instagramMessage"});
    expect(screen.getByText("1. Open Instagram as @carterroadrunners.")).toBeTruthy();
    expect(screen.getByRole("link", {name: "Open Instagram"}).getAttribute("href")).toBe(`https://ig.me/m/${brand.social.instagramHandle}`);

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

  it("goes straight to a review request when no check works for the listing", async () => {
    firebase.getOrganizerClaimVerificationOptions.mockResolvedValue(options(false, false));
    renderSection();
    expect(await screen.findByText(/has no Instagram account or Luma calendar we can check yet/u)).toBeTruthy();
    expect(screen.getByRole("button", {name: "Ask for a review"})).toBeTruthy();
    expect(screen.queryByRole("button", {name: "Use a code instead"})).toBeNull();
  });

  it("asks only for proof links in a review, taking name and phone from the account", async () => {
    firebase.getOrganizerClaimVerificationOptions.mockResolvedValue(options(true, false));
    firebase.requestOrganizerClaim.mockResolvedValue({requestId: "r1"});
    renderSection();
    fireEvent.click(await screen.findByRole("button", {name: "Ask for a review instead"}));
    fireEvent.click(screen.getByRole("button", {name: "Ask for a review"}));
    expect(await screen.findByText("Add at least one link that shows the page is yours.")).toBeTruthy();
    expect(firebase.requestOrganizerClaim).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("Links that show it’s yours"), {target: {value: "carterroadrunners.in"}});
    fireEvent.click(screen.getByRole("button", {name: "Ask for a review"}));
    expect(await screen.findByText("We’ll check it.")).toBeTruthy();
    expect(firebase.requestOrganizerClaim).toHaveBeenCalledWith({organizerId: listing.id, requesterName: "Asha Rao",
      requesterRole: "owner", businessEmail: null, businessPhone: "+919800000000",
      proofUrls: ["https://carterroadrunners.in"], message: null});
  });

  it("still offers a code after a review request is pending", async () => {
    firebase.getOrganizerClaimVerificationOptions.mockResolvedValue(options(true, false));
    renderSection(true);
    expect(screen.getByText("Your review request is in. You can skip the wait and prove it now.")).toBeTruthy();
    expect(await screen.findByRole("button", {name: "Show my code"})).toBeTruthy();
  });

  it("offers a new code once the attempt expires", async () => {
    firebase.getOrganizerClaimVerificationOptions.mockResolvedValue(options(true, false));
    firebase.startOrganizerClaimVerification.mockResolvedValue({attemptId: "a3", organizerId: listing.id,
      method: "instagramMessage", code: "111222", proofText: "111222", proofTarget: "carterroadrunners",
      catchInstagramHandle: brand.social.instagramHandle, expiresAt: new Date(Date.now() - 1000).toISOString()});
    firebase.watchOrganizerClaimAttempt.mockResolvedValue(vi.fn());
    renderSection();
    fireEvent.click(await screen.findByRole("button", {name: "Show my code"}));
    expect(await screen.findByText("This code has expired. Show a new one to try again.")).toBeTruthy();
    expect(screen.getByRole("button", {name: "Show a new code"})).toBeTruthy();
  });
});
