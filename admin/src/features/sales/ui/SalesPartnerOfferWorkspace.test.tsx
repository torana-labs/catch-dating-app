import {cleanup, fireEvent, render, screen, within} from "@testing-library/react";
import {afterEach, beforeAll, beforeEach, expect, it, vi} from "vitest";
import {createQueryHarness} from "../../../shared/test/queryHarness";
import {SalesPartnerOfferWorkspace} from "./SalesPartnerOfferWorkspace";

const state = vi.hoisted(() => ({offer: vi.fn(), retry: vi.fn(), ticket: null as object | null,
  error: null, offeredTo: null as string | null, busy: false}));
vi.mock("../controllers/useSalesPartnerOfferController", () => ({useSalesPartnerOfferController: () => state}));

afterEach(cleanup);
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) { this.removeAttribute("open"); };
});
beforeEach(() => { state.offer.mockReset(); state.offer.mockResolvedValue(true); state.ticket = null; state.offeredTo = null; });

function show() {
  const {wrapper} = createQueryHarness();
  return render(<SalesPartnerOfferWorkspace actorUid="admin" organizerId="host" organizerName="Example" />, {wrapper});
}
const sheet = () => within(document.querySelector("dialog") as HTMLElement);
const fill = (label: RegExp, value: string) => fireEvent.change(sheet().getByLabelText(label), {target: {value}});
const offer = () => sheet().getByRole<HTMLButtonElement>("button", {name: "Offer"});

it("requires checking the exact account, and changing the offer clears that check", () => {
  show();
  fireEvent.click(screen.getByRole("button", {name: "Offer"}));
  fill(/^Partner's account id/u, "partner");
  fill(/^What they should do next/u, "Verify buyer");
  fill(/^Why this partner/u, "Reviewed identity");
  fill(/^Review on/u, "2026-11-10T18:00");
  fill(/^Offer ends/u, "2026-11-25T18:00");
  expect(offer().disabled).toBe(true);
  fireEvent.click(sheet().getByRole("checkbox"));
  expect(offer().disabled).toBe(false);
  fill(/^Partner's account id/u, "another-partner");
  expect(offer().disabled).toBe(true);
  fireEvent.click(sheet().getByRole("checkbox"));
  fireEvent.click(offer());
  expect(state.offer).toHaveBeenCalledWith(expect.objectContaining({partnerUid: "another-partner", nextAction: "Verify buyer"}));
});

it("locks the fields when the outcome is unknown, and offers the same request again", () => {
  state.ticket = {};
  show();
  fireEvent.click(screen.getByRole("button", {name: "Offer"}));
  expect(sheet().getByLabelText(/^Partner's account id/u)).toHaveProperty("disabled", true);
  fireEvent.click(sheet().getByRole("button", {name: "Retry the same offer"}));
  expect(state.retry).toHaveBeenCalled();
});

it("shows who it was offered to, and no more offering", () => {
  state.offeredTo = "partner";
  show();
  expect(screen.getByText(/Offered to account partner/u)).toBeTruthy();
  expect(screen.queryByRole("button", {name: "Offer"})).toBeNull();
});
