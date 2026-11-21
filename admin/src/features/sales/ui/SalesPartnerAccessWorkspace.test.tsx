import {cleanup, fireEvent, render, screen, within} from "@testing-library/react";
import {afterEach, beforeAll, beforeEach, expect, it, vi} from "vitest";
import {createQueryHarness} from "../../../shared/test/queryHarness";
import type {PartnerAccess} from "../api/salesPartnerAccess";
import {SalesPartnerAccessWorkspace} from "./SalesPartnerAccessWorkspace";

const offerState = vi.hoisted(() => ({offer: vi.fn(), retry: vi.fn(), ticket: null as object | null,
  error: null, offeredTo: null as string | null, busy: false}));
const accessState = vi.hoisted(() => ({access: null as unknown, loading: false, loadError: null as string | null,
  refresh: vi.fn(), revoke: vi.fn(), retry: vi.fn(), ticket: null as object | null, error: null as string | null,
  revoked: null, busy: false}));
const offerArgs = vi.hoisted(() => [] as unknown[][]);
vi.mock("../controllers/useSalesPartnerOfferController", () => ({useSalesPartnerOfferController: (...args: unknown[]) => {
  offerArgs.push(args); return offerState;
}}));
vi.mock("../controllers/useSalesPartnerAccessController", () => ({useSalesPartnerAccessController: () => accessState}));

const accepted: PartnerAccess = {
  organizerId: "host",
  assignment: {partnerUid: "partner", state: "accepted", revision: 2, reviewAt: "2026-11-25T12:00:00.000Z",
    expiresAt: "2026-12-10T12:00:00.000Z", updatedAt: "2026-11-20T12:00:00.000Z"},
  membership: {partnerUid: "partner", displayName: "Example partner", state: "active", revision: 1,
    expiresAt: "2027-02-01T12:00:00.000Z"},
  evaluatedAt: "2026-11-22T12:00:00.000Z",
};
const none: PartnerAccess = {organizerId: "host", assignment: null, membership: null, evaluatedAt: accepted.evaluatedAt};

afterEach(cleanup);
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) { this.removeAttribute("open"); };
});
beforeEach(() => {
  offerState.offer.mockReset(); offerState.offer.mockResolvedValue(true); offerState.ticket = null; offerState.offeredTo = null;
  accessState.revoke.mockReset(); accessState.revoke.mockResolvedValue(true); accessState.retry.mockReset();
  accessState.access = none; accessState.loadError = null; accessState.ticket = null; accessState.error = null;
  offerArgs.length = 0;
});

function show() {
  const {wrapper} = createQueryHarness();
  return render(<SalesPartnerAccessWorkspace actorUid="admin" organizerId="host" organizerName="Example" />, {wrapper});
}
const sheet = () => within(document.querySelector("dialog") as HTMLElement);
const fill = (label: RegExp, value: string) => fireEvent.change(sheet().getByLabelText(label), {target: {value}});
const offer = () => sheet().getByRole<HTMLButtonElement>("button", {name: "Offer"});

it("requires checking the exact account, and changing the offer clears that check", () => {
  show();
  expect(screen.getByText("Not offered")).toBeTruthy();
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
  expect(offerState.offer).toHaveBeenCalledWith(expect.objectContaining({partnerUid: "another-partner", nextAction: "Verify buyer"}));
});

it("locks the offer fields when the outcome is unknown, and offers the same request again", () => {
  offerState.ticket = {};
  show();
  fireEvent.click(screen.getByRole("button", {name: "Offer"}));
  expect(sheet().getByLabelText(/^Partner's account id/u)).toHaveProperty("disabled", true);
  fireEvent.click(sheet().getByRole("button", {name: "Retry the same offer"}));
  expect(offerState.retry).toHaveBeenCalled();
});

it("re-offers a host whose reservation was revoked at that reservation's revision", () => {
  accessState.access = {...accepted, assignment: {...accepted.assignment!, state: "revoked", revision: 3}};
  show();
  expect(screen.getByText("Revoked from Example partner")).toBeTruthy();
  expect(screen.getByRole("button", {name: "Offer"})).toBeTruthy();
  expect(offerArgs.at(-1)).toEqual(["admin", "host", 3]);
});

it("shows who has the host, offers no second offer, and revokes only after a reason and a check", () => {
  accessState.access = accepted;
  show();
  expect(screen.getByText(/Example partner is working on this host until/u)).toBeTruthy();
  expect(screen.queryByRole("button", {name: "Offer"})).toBeNull();
  fireEvent.click(screen.getByRole("button", {name: "Revoke"}));
  const revoke = () => sheet().getByRole<HTMLButtonElement>("button", {name: "Revoke this host"});
  expect(revoke().disabled).toBe(true);
  fill(/^Why/u, "The host asked to work with Catch directly");
  expect(revoke().disabled).toBe(true);
  fireEvent.click(sheet().getByRole("checkbox"));
  expect(revoke().disabled).toBe(false);
  fireEvent.click(revoke());
  expect(accessState.revoke).toHaveBeenCalledWith("host", "The host asked to work with Catch directly");
});

it("revokes the whole partner account only when chosen, and clears the check when the choice changes", () => {
  accessState.access = accepted;
  show();
  fireEvent.click(screen.getByRole("button", {name: "Revoke"}));
  fill(/^Why/u, "Left the programme");
  fireEvent.click(sheet().getByRole("checkbox"));
  fireEvent.click(sheet().getByRole("radio", {name: "Their whole partner account"}));
  const revoke = sheet().getByRole<HTMLButtonElement>("button", {name: "Revoke their partner account"});
  expect(revoke.disabled).toBe(true);
  fireEvent.click(sheet().getByRole("checkbox"));
  fireEvent.click(revoke);
  expect(accessState.revoke).toHaveBeenCalledWith("partner", "Left the programme");
});

it("keeps a closed partner account out of reach and retries an unconfirmed revoke unchanged", () => {
  accessState.access = {...accepted, membership: {...accepted.membership!, state: "revoked", revision: 2}};
  accessState.ticket = {};
  accessState.error = "We couldn't confirm the revoke. Retry the same request: it can't revoke twice.";
  show();
  fireEvent.click(screen.getByRole("button", {name: "Revoke"}));
  expect(sheet().getByRole("radio", {name: "Their whole partner account"})).toHaveProperty("disabled", true);
  expect(sheet().getByRole("alert").textContent).toMatch(/Retry the same request/u);
  fireEvent.click(sheet().getByRole("button", {name: "Retry the same revoke"}));
  expect(accessState.retry).toHaveBeenCalled();
});

it("says when partner access could not load and offers nothing until it does", () => {
  accessState.access = null; accessState.loadError = "Partner access could not load. Try again.";
  show();
  expect(screen.queryByRole("button", {name: "Offer"})).toBeNull();
  fireEvent.click(screen.getByRole("button", {name: "Try again"}));
  expect(accessState.refresh).toHaveBeenCalled();
});
