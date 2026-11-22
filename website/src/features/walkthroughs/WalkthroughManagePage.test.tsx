import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {cleanup, fireEvent, render as renderInto, screen, waitFor, within} from "@testing-library/react";
import {StrictMode} from "react";
import {afterEach, describe, expect, it, vi} from "vitest";
import {walkthroughBookingCopy as copy} from "@content/walkthroughBooking";
import {
  scriptedWalkthroughClient,
  walkthroughFixtureBookingId,
  walkthroughFixtureToken,
  walkthroughManagedFor,
  walkthroughOpenSlots,
  walkthroughRefusal,
  walkthroughSlotsAfterTaken,
} from "../../stories/fixtures/walkthroughBooking";
import {provideWalkthroughDeps, type WalkthroughDeps} from "./walkthroughClientContext";
import {walkthroughManagePageNode} from "./WalkthroughManagePage";

vi.mock("../../firebase", () => ({}));

afterEach(cleanup);

const words = copy.manage;
const search = `?booking=${walkthroughFixtureBookingId}`;
const hash = `#t=${walkthroughFixtureToken}`;

function render(deps: WalkthroughDeps, link: {search: string; hash: string} = {search, hash}): void {
  renderInto(<StrictMode><QueryClientProvider client={new QueryClient()}>
    {provideWalkthroughDeps(deps, walkthroughManagePageNode({search: link.search, hash: link.hash}))}
  </QueryClientProvider></StrictMode>);
}

describe("walkthrough manage page", () => {
  it("says so when the link names no booking", () => {
    render({client: scriptedWalkthroughClient().client}, {search: "", hash: ""});
    expect(screen.getByRole("alert").textContent).toBe(words.problems.missing);
  });

  it("reads the booking with the link's token and shows it in India time", async () => {
    const {client, calls} = scriptedWalkthroughClient();
    render({client, timeZone: "Asia/Kolkata"});
    expect(await screen.findByText("Mon 23 Nov, 4:00 PM IST")).toBeTruthy();
    expect(screen.getByText(words.status.booked)).toBeTruthy();
    expect(screen.getByText(words.pending)).toBeTruthy();
    expect(calls.manage[0]).toEqual({bookingId: walkthroughFixtureBookingId, action: "read", manageToken: walkthroughFixtureToken});
  });

  it("moves the booking to another open time", async () => {
    const moved = walkthroughManagedFor({slot: walkthroughOpenSlots.days[1].slots[0], changed: true});
    const {client, calls} = scriptedWalkthroughClient({manage: [
      (() => calls.manage.at(-1)?.action === "reschedule" ? moved : walkthroughManagedFor())]});
    render({client, timeZone: "Asia/Kolkata"});
    fireEvent.click(await screen.findByRole("button", {name: words.move}));
    expect(await screen.findByRole("heading", {name: words.moveTitle})).toBeTruthy();
    fireEvent.click(within(await screen.findByRole("radiogroup", {name: copy.day})).getByRole("radio", {name: "Tue 24 Nov"}));
    fireEvent.click(within(screen.getByRole("radiogroup", {name: copy.time})).getByRole("radio", {name: "11:00 AM"}));
    fireEvent.click(screen.getByRole("button", {name: words.moveConfirm}));
    expect(await screen.findByText(words.moved)).toBeTruthy();
    expect(screen.getByText("Tue 24 Nov, 11:00 AM IST")).toBeTruthy();
    expect(calls.manage.at(-1)).toEqual({bookingId: walkthroughFixtureBookingId, manageToken: walkthroughFixtureToken,
      action: "reschedule", slotStartAt: "2026-11-24T05:30:00.000Z"});
  });

  it("reloads the times when the new time was taken meanwhile", async () => {
    let taken = false;
    const {client} = scriptedWalkthroughClient({slots: [() => taken ? walkthroughSlotsAfterTaken : walkthroughOpenSlots]});
    client.manage = async (payload) => {
      if (payload.action !== "reschedule") return walkthroughManagedFor();
      taken = true;
      throw walkthroughRefusal("already-exists", "slot_taken");
    };
    render({client, timeZone: "Asia/Kolkata"});
    fireEvent.click(await screen.findByRole("button", {name: words.move}));
    fireEvent.click(within(await screen.findByRole("radiogroup", {name: copy.time})).getByRole("radio", {name: "10:00 AM"}));
    fireEvent.click(screen.getByRole("button", {name: words.moveConfirm}));
    expect((await screen.findByRole("alert")).textContent).toBe(copy.problems.slotTaken);
    await waitFor(() => expect(within(screen.getByRole("radiogroup", {name: copy.time})).queryByRole("radio", {name: "10:00 AM"})).toBeNull());
  });

  it("cancels with an optional reason and offers a new booking", async () => {
    const {client, calls} = scriptedWalkthroughClient({manage: [
      () => calls.manage.at(-1)?.action === "cancel" ? walkthroughManagedFor({status: "cancelled", canChange: false, changed: true}) : walkthroughManagedFor()]});
    render({client, timeZone: "Asia/Kolkata"});
    fireEvent.click(await screen.findByRole("button", {name: words.cancel}));
    fireEvent.change(await screen.findByRole("textbox", {name: new RegExp(words.cancelReason.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"), "u")}),
      {target: {value: "Found another time with the team"}});
    fireEvent.click(screen.getByRole("button", {name: words.cancelConfirm}));
    expect(await screen.findByText(words.cancelled)).toBeTruthy();
    expect(screen.getByText(words.status.cancelled)).toBeTruthy();
    expect(screen.getByRole("link", {name: words.bookAgain}).getAttribute("href")).toBe("/host/walkthrough/");
    expect(calls.manage.at(-1)).toEqual({bookingId: walkthroughFixtureBookingId, manageToken: walkthroughFixtureToken,
      action: "cancel", reason: "Found another time with the team"});
  });

  it("asks for the booked number when the link has no token", async () => {
    const {client} = scriptedWalkthroughClient({manage: [walkthroughRefusal("permission-denied", "not_yours")]});
    render({client}, {search, hash: ""});
    expect(await screen.findByText(words.signInLead)).toBeTruthy();
    expect(screen.getByRole("button", {name: words.signIn})).toBeTruthy();
  });

  it("says when the booking cannot be found", async () => {
    render({client: scriptedWalkthroughClient({manage: [walkthroughRefusal("not-found", "not_found")]}).client});
    expect((await screen.findByRole("alert")).textContent).toBe(words.problems.notFound);
  });

  it("says when a booking has moved too often", async () => {
    const {client} = scriptedWalkthroughClient();
    client.manage = async (payload) => {
      if (payload.action === "reschedule") throw walkthroughRefusal("failed-precondition", "too_many_changes");
      return walkthroughManagedFor();
    };
    render({client, timeZone: "Asia/Kolkata"});
    fireEvent.click(await screen.findByRole("button", {name: words.move}));
    fireEvent.click(within(await screen.findByRole("radiogroup", {name: copy.time})).getByRole("radio", {name: "10:30 AM"}));
    fireEvent.click(screen.getByRole("button", {name: words.moveConfirm}));
    expect((await screen.findByRole("alert")).textContent).toBe(words.problems.tooManyChanges);
  });
});
