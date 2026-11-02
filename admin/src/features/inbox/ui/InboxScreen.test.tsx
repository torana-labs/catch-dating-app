import {cleanup, fireEvent, render, screen, waitFor} from "@testing-library/react";
import {afterEach, beforeAll, describe, expect, it, vi} from "vitest";
import {InboxScreen, type InboxScreenModel} from "./InboxScreen";

const stuck = {itemId: "supply-sunday-table", type: "stuck", sourceKind: "supplyIntakeRequest", sourceId: "sunday-table",
  sourcePath: "supplyIntakeRequests/sunday-table", title: "Sunday Table", subtitle: "Instagram asked to sign in.",
  cameFrom: "Sales associate on WhatsApp", nominatorUid: null, city: "mumbai",
  state: {code: "needs_person", label: "Needs a person", tone: "danger"}, status: "waiting",
  waitingSince: "2026-10-30T10:00:00.000Z", doneAt: null, assigneeUid: null, snoozedUntil: null, recommendation: null,
  listingEvent: null};

function model(fillInByHand = vi.fn(async () => true)) {
  return {items: [stuck], totals: {scopes: {waiting: 1, mine: 0, snoozed: 0, working: 0},
    types: {all: 1, listing: 0, event: 0, claim: 0, enquiry: 0, access: 0, stuck: 1}},
  scope: "waiting", type: null, city: null, page: {isPending: false, isError: false},
  detail: {item: stuck, journey: [], canWork: true, canDecideClaim: false}, detailError: false,
  position: null, nextItem: null, previousItem: null, isWorking: false, isFillingIn: false,
  listingReview: null, listingReviewFailed: false, eventReview: null, eventReviewFailed: false,
  claimEvidence: null, claimEvidenceFailed: false, hostQuery: "", hostMatches: [],
  updateItem: vi.fn(), fillInByHand} as unknown as InboxScreenModel;
}

const draw = (inbox: InboxScreenModel, canFillIn: boolean) => render(<InboxScreen canFillIn={canFillIn} model={inbox}
  onSelect={vi.fn()} selectedItemId={stuck.itemId} uid="uid-1" />);

describe("a stuck nomination in the inbox", () => {
  beforeAll(() => {
    HTMLDialogElement.prototype.showModal = function showModal() { this.open = true; };
    HTMLDialogElement.prototype.close = function close() { this.open = false; };
  });
  afterEach(cleanup);

  it("starts again from what the owner or Sales types", async () => {
    const fillInByHand = vi.fn(async () => true);
    draw(model(fillInByHand), true);
    fireEvent.click(screen.getByRole("button", {name: "Fill in by hand"}));
    expect((screen.getByRole("textbox", {name: /Organizer name/u}) as HTMLInputElement).value).toBe("Sunday Table");
    expect((screen.getByRole("textbox", {name: /City/u}) as HTMLInputElement).value).toBe("Mumbai");
    fireEvent.change(screen.getByRole("textbox", {name: /Links/u}), {target: {value: "https://sundaytable.example\n"}});
    fireEvent.click(screen.getByRole("button", {name: "Build a new listing"}));
    await waitFor(() => expect(fillInByHand).toHaveBeenCalledWith({name: "Sunday Table", market: "Mumbai",
      urls: ["https://sundaytable.example"], notes: null, categories: []}, stuck.itemId));
    await waitFor(() => expect(screen.queryByRole("button", {name: "Build a new listing"})).toBeNull());
  });

  it("holds back a link that is not a web address", () => {
    const fillInByHand = vi.fn(async () => true);
    draw(model(fillInByHand), true);
    fireEvent.click(screen.getByRole("button", {name: "Fill in by hand"}));
    fireEvent.change(screen.getByRole("textbox", {name: /Links/u}), {target: {value: "instagram.com/sundaytable"}});
    fireEvent.click(screen.getByRole("button", {name: "Build a new listing"}));
    expect(fillInByHand).not.toHaveBeenCalled();
    expect(screen.getByText(/Links start with https/u)).toBeTruthy();
  });

  it("leaves ops able to pick it up or dismiss it, and says who can fill it in", () => {
    draw(model(), false);
    expect(screen.queryByRole("button", {name: "Fill in by hand"})).toBeNull();
    expect(screen.getByRole("button", {name: "Pick it up"})).toBeTruthy();
    expect(screen.getByRole("button", {name: "Dismiss"})).toBeTruthy();
    expect(screen.getByText("Only the owner or Sales can fill this in by hand")).toBeTruthy();
  });
});
