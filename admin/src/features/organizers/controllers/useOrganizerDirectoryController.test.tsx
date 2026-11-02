import {act, renderHook, waitFor} from "@testing-library/react";
import {describe, expect, it, vi} from "vitest";
import {createQueryHarness} from "../../../shared/test/queryHarness";
import {useOrganizerDirectoryController} from "./useOrganizerDirectoryController";
import {useOrganizerOverviewController} from "./useOrganizerOverviewController";
import {
  journeyStepCopy,
  cameFromLabel,
  creditToLabel,
  nextStepCopy,
  organizerClaimLabel,
  organizerPageLabel,
  organizerSubtitle,
  paymentsLabel,
  salesOwnerShortName,
  termsLabel,
  upcomingLabel,
} from "./organizerRecordLabels";

describe("useOrganizerDirectoryController", () => {
  it("shows real totals and narrows by chips", async () => {
    const {wrapper} = createQueryHarness();
    const {result} = renderHook(() => useOrganizerDirectoryController(),
      {wrapper});

    await waitFor(() => expect(result.current.loadState).toBe("ready"));
    expect(result.current.total).toBe(4);
    expect(result.current.views).toEqual(
      {all: 4, live: 3, unclaimed: 2, hidden: 0});
    expect(result.current.rows.map((row) => row.organizerId)).toEqual(
      ["afterfly", "bhag", "bandra-runners", "mumbai-padel-social"]);
    expect(result.current.rows[0].upcomingEventCount).toBe(2);

    act(() => result.current.toggleCity("in-mh-mumbai"));
    await waitFor(() => expect(result.current.total).toBe(3));
    // The city chips keep counting as if no city were picked.
    expect(result.current.facets?.cities.map((city) => city.count))
      .toEqual([3, 1]);

    act(() => result.current.toggleCity("in-mh-mumbai"));
    act(() => result.current.toggleMine());
    await waitFor(() => expect(result.current.total).toBe(2));
  });
});

describe("useOrganizerOverviewController", () => {
  it("loads an organizer's journey and next step", async () => {
    const {wrapper} = createQueryHarness();
    const {result} = renderHook(
      () => useOrganizerOverviewController("afterfly", {onError: vi.fn(), onNotice: vi.fn()}), {wrapper});

    await waitFor(() => expect(result.current.loadState).toBe("ready"));
    expect(result.current.overview?.journey.map((step) => step.kind))
      .toEqual(["nominated", "listingBuilt", "approved", "listed"]);
    expect(result.current.overview?.nextStep).toBe("claim");
  });

  it("checks for new events and says what it is reading", async () => {
    const {wrapper} = createQueryHarness();
    const onError = vi.fn();
    const onNotice = vi.fn();
    const {result} = renderHook(
      () => useOrganizerOverviewController("afterfly", {onError, onNotice}), {wrapper});
    await act(async () => { await result.current.checkForEvents(); });
    expect(onError).toHaveBeenCalledWith(null);
    expect(onNotice).toHaveBeenCalledWith(expect.stringContaining("Reading 1 page for new events."));
  });

  it("reports an organizer that is not there", async () => {
    const {wrapper} = createQueryHarness();
    const {result} = renderHook(
      () => useOrganizerOverviewController("missing", {onError: vi.fn(), onNotice: vi.fn()}), {wrapper});
    await waitFor(() => expect(result.current.loadState).toBe("error"));
    expect(result.current.loadError).toContain("not found");
  });
});

describe("organizer record labels", () => {
  it("says what the page, claim and terms are in words", () => {
    expect(organizerPageLabel("hiddenFromSearch")).toEqual(
      {text: "Published · hidden from search", tone: "warning"});
    expect(organizerClaimLabel({claimState: "claimed",
      claimedByName: "Meher"}).text).toBe("Claimed by Meher");
    expect(organizerSubtitle({cityLabel: "Mumbai",
      kindLabel: "Social nights"})).toBe("Mumbai · social nights");
    expect(termsLabel({source: "platform", rateBasisPoints: 500,
      capMinor: 1_000_000})).toBe("Platform: 5%, capped at ₹10,000 a month");
    expect(termsLabel({source: "unset", rateBasisPoints: null,
      capMinor: null})).toBe("Not set up yet");
    expect(salesOwnerShortName({uid: "r", name: "Riya Sharma"})).toBe("Riya");
    expect(salesOwnerShortName(null)).toBe("—");
    expect(upcomingLabel(0)).toBe("None");
    expect(upcomingLabel(3)).toBe("3 upcoming");
    expect(paymentsLabel({state: "connected", webhookVerified: true}).tone)
      .toBe("success");
    expect(paymentsLabel({state: "notConnected", webhookVerified: false}).text)
      .toBe("Razorpay not connected");
  });

  it("writes journey steps as sentences", () => {
    expect(journeyStepCopy({kind: "nominated", at: null,
      actorName: "Riya Sharma", detail: "https://luma.com/afterfly"},
    "Afterfly")).toEqual({title: "Riya Sharma nominated it",
      subtitle: "luma.com/afterfly"});
    expect(journeyStepCopy({kind: "listingBuilt", at: null, actorName: null,
      detail: "3"}, "Afterfly").subtitle).toBe("3 events found");
    expect(nextStepCopy("claim", "Riya")?.subtitle)
      .toBe("Send them the claim link, or Riya will on the follow-up");
    expect(nextStepCopy(null, null)).toBeNull();
  });

  it("says where an organizer came from and who earns credit", () => {
    const partner = {channel: "partner" as const, nominator: {uid: "n",
      name: "Neha Kulkarni", role: "partner" as const},
    firstPaidBookingAt: null};
    expect(cameFromLabel(partner)).toBe("Neha Kulkarni, partner");
    expect(creditToLabel(partner)).toBe("Neha Kulkarni, partner");
    const associate = {channel: "sales_associate" as const, nominator: {
      uid: "r", name: "Riya Sharma", role: "associate" as const},
    firstPaidBookingAt: null};
    expect(creditToLabel(associate)).toBe("No one");
    expect(cameFromLabel({channel: "imported", nominator: null,
      firstPaidBookingAt: null})).toBe("Catch found it");
    expect(cameFromLabel(null)).toBe("Not recorded");
  });
});
