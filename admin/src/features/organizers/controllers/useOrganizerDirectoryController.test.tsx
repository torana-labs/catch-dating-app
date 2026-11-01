import {act, renderHook, waitFor} from "@testing-library/react";
import {describe, expect, it} from "vitest";
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
  termsLabel,
} from "./organizerRecordLabels";

describe("useOrganizerDirectoryController", () => {
  it("shows real totals and narrows by chips", async () => {
    const {wrapper} = createQueryHarness();
    const {result} = renderHook(() => useOrganizerDirectoryController(),
      {wrapper});

    await waitFor(() => expect(result.current.loadState).toBe("ready"));
    expect(result.current.total).toBe(6);
    expect(result.current.views).toEqual(
      {all: 6, live: 4, unclaimed: 3, hidden: 1});
    expect(result.current.rows[0].name).toBe("Afterfly");

    act(() => result.current.toggleCity("in-mp-indore"));
    await waitFor(() => expect(result.current.total).toBe(1));
    expect(result.current.rows.map((row) => row.name)).toEqual(["AFTER FLY"]);
    // The city chips keep counting as if no city were picked.
    expect(result.current.facets?.cities.map((city) => city.count))
      .toEqual([5, 1]);

    act(() => result.current.toggleCity("in-mp-indore"));
    act(() => result.current.toggleMine());
    await waitFor(() => expect(result.current.total).toBe(3));
  });
});

describe("useOrganizerOverviewController", () => {
  it("loads an organizer's journey and next step", async () => {
    const {wrapper} = createQueryHarness();
    const {result} = renderHook(
      () => useOrganizerOverviewController("afterfly"), {wrapper});

    await waitFor(() => expect(result.current.loadState).toBe("ready"));
    expect(result.current.overview?.journey.map((step) => step.kind))
      .toEqual(["nominated", "listingBuilt", "approved", "listed"]);
    expect(result.current.overview?.nextStep).toBe("claim");
  });

  it("reports an organizer that is not there", async () => {
    const {wrapper} = createQueryHarness();
    const {result} = renderHook(
      () => useOrganizerOverviewController("missing"), {wrapper});
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
