import {describe, expect, it} from "vitest";
import {followerMonth, insightsWindow, isOwnerViewRow, ownerViewFromRow, type OwnerViewRow} from "./ownerViewModel";
import {isOwnerViewData} from "./ownerViewTypes";

const now = Date.UTC(2026, 10, 20, 9);
const day = (back: number) => new Date(now - back * 86_400_000).toISOString().slice(0, 10);

const row: OwnerViewRow = {
  organizerId: "lantern",
  ownerUid: "owner-uid",
  capabilitiesByRole: {
    owner: ["insights", "links", "about", "photos", "reviews", "messageFollowers", "settings", "openInHost"],
    editor: ["insights", "links", "photos", "reviews", "messageFollowers", "openInHost"],
    analyst: ["insights", "openInHost"],
  },
  insightDays: [
    {date: day(35), visits: 99, linkClicks: 0, bookingClicks: 0, newFollowers: 0, sources: [], links: []},
    {date: day(2), visits: 12, linkClicks: 3, bookingClicks: 1, newFollowers: 2,
      sources: [{source: "instagram", clicks: 3}], links: [{linkId: "l1", clicks: 3}]},
  ],
  links: [],
  about: "Runs every Sunday.",
  photos: [],
  followerMessageLimit: 2,
  followerMessageMonths: [{month: "2026-11", used: 1}, {month: "2026-10", used: 2}],
  whatsappAvailable: true,
};

describe("ownerViewFromRow", () => {
  it("makes the owner the owner and any other reader an editor", () => {
    const owner = ownerViewFromRow(row, "owner-uid", now);
    expect(owner.role).toBe("owner");
    expect(owner.capabilities).toContain("settings");
    const editor = ownerViewFromRow(row, "manager-uid", now);
    expect(editor.role).toBe("editor");
    expect(editor.capabilities).not.toContain("about");
    expect(isOwnerViewData(owner)).toBe(true);
  });

  it("windows the last 30 complete days and leaves older ones out", () => {
    const window = insightsWindow(now, row.insightDays);
    expect(window.days).toHaveLength(30);
    expect(window.startDate).toBe(day(30));
    expect(window.endDate).toBe(day(1));
    expect(window.totals).toEqual({visits: 12, linkClicks: 3, bookingClicks: 1, newFollowers: 2});
    expect(window.updatedThrough).toBe(day(2));
    expect(window.sources).toEqual([{source: "instagram", clicks: 3}]);
  });

  it("counts this month's follower messages in India", () => {
    expect(followerMonth(Date.UTC(2026, 10, 30, 19))).toBe("2026-12");
    const view = ownerViewFromRow(row, "owner-uid", now);
    expect(view.followerMessages).toMatchObject({month: "2026-11", limit: 2, used: 1, whatsappAvailable: true});
    expect(ownerViewFromRow(row, "owner-uid", Date.UTC(2027, 0, 5)).followerMessages.used).toBe(0);
  });

  it("refuses a row of another organizer or the wrong shape", () => {
    expect(isOwnerViewRow(row, "lantern")).toBe(true);
    expect(isOwnerViewRow(row, "harbor")).toBe(false);
    expect(isOwnerViewRow({...row, insightDays: null}, "lantern")).toBe(false);
  });
});
