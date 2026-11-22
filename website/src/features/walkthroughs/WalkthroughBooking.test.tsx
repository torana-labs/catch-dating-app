import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {cleanup, fireEvent, render as renderInto, screen, waitFor, within} from "@testing-library/react";
import {StrictMode} from "react";
import {afterEach, beforeAll, describe, expect, it, vi} from "vitest";
import {signInCopy} from "@content/account";
import {playbookCopy} from "@content/playbook/playbookCopy";
import {walkthroughBookingCopy as copy} from "@content/walkthroughBooking";
import walkthroughPage from "@content/playbook/pages/host/walkthrough.json";
import type {PlaybookLeadForm} from "../../content/playbook/playbookContract";
import {
  scriptedWalkthroughClient,
  walkthroughBookingClosed,
  walkthroughFixtureBookingId,
  walkthroughFixturePhone,
  walkthroughNoSlots,
  walkthroughOpenSlots,
  walkthroughRefusal,
  walkthroughSlotsAfterTaken,
} from "../../stories/fixtures/walkthroughBooking";
import {walkthroughBookingNode} from "./WalkthroughBooking";
import {provideWalkthroughDeps, type WalkthroughDeps} from "./walkthroughClientContext";

vi.mock("../../firebase", () => ({}));

afterEach(cleanup);

// jsdom has no modal dialog; these stand in for the browser's open state (the sign-in sheet is one on phones).
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.removeAttribute("open");
  };
});

/** The walkthrough page's own request form, as its JSON writes it. */
const form = walkthroughPage.sections.flatMap((section) => "leadForm" in section && section.leadForm ? [section.leadForm as PlaybookLeadForm] : [])[0]!;
const fallbackText = "The request form";

/** StrictMode mounts the booking twice, as in development; the sign-in sheet's controller needs the query client. */
function render(deps: WalkthroughDeps): void {
  renderInto(<StrictMode><QueryClientProvider client={new QueryClient()}>
    {provideWalkthroughDeps(deps, walkthroughBookingNode({form, pageId: "host_walkthrough", sectionId: "book", fallback: <p>{fallbackText}</p>}))}
  </QueryClientProvider></StrictMode>);
}

const dayGroup = () => screen.getByRole("radiogroup", {name: copy.day});
const timeGroup = () => screen.getByRole("radiogroup", {name: copy.time});

async function pickAndContinue(day: string, time: string) {
  fireEvent.click(within(await screen.findByRole("radiogroup", {name: copy.day})).getByRole("radio", {name: day}));
  fireEvent.click(within(timeGroup()).getByRole("radio", {name: time}));
  fireEvent.click(screen.getByRole("button", {name: copy.continue}));
}

function fillDetails() {
  fireEvent.change(screen.getByRole("textbox", {name: /Your name/u}), {target: {value: "Asha Rivera"}});
  fireEvent.change(screen.getByRole("textbox", {name: /Organisation/u}), {target: {value: "Harbour Lane Studio"}});
  fireEvent.change(screen.getByRole("textbox", {name: /What you run/u}), {target: {value: "Pottery evenings"}});
}

describe("walkthrough slot picker", () => {
  it("groups the open slots by day and shows each day's times in India time", async () => {
    render({client: scriptedWalkthroughClient().client, timeZone: "Asia/Kolkata"});
    expect(await screen.findByRole("heading", {name: copy.title})).toBeTruthy();
    const days = within(dayGroup()).getAllByRole("radio").map((radio) => radio.textContent);
    expect(days).toEqual(["Mon 23 Nov", "Tue 24 Nov"]);
    expect(within(dayGroup()).getByRole("radio", {name: "Mon 23 Nov"}).getAttribute("aria-checked")).toBe("true");
    expect(within(timeGroup()).getAllByRole("radio").map((radio) => radio.textContent)).toEqual(["10:00 AM", "10:30 AM", "4:00 PM"]);
    // Visitors on India time see the slot length, not a second clock.
    expect(screen.getByText("30 minutes")).toBeTruthy();
    fireEvent.click(within(dayGroup()).getByRole("radio", {name: "Tue 24 Nov"}));
    expect(within(timeGroup()).getAllByRole("radio").map((radio) => radio.textContent)).toEqual(["11:00 AM"]);
  });

  it("moves between days with the arrow keys", async () => {
    render({client: scriptedWalkthroughClient().client, timeZone: "Asia/Kolkata"});
    const monday = within(await screen.findByRole("radiogroup", {name: copy.day})).getByRole("radio", {name: "Mon 23 Nov"});
    monday.focus();
    fireEvent.keyDown(monday, {key: "ArrowRight"});
    const tuesday = within(dayGroup()).getByRole("radio", {name: "Tue 24 Nov"});
    expect(document.activeElement).toBe(tuesday);
    expect(tuesday.getAttribute("aria-checked")).toBe("true");
  });

  it("says the chosen time on the visitor's own clock when it is not India time", async () => {
    render({client: scriptedWalkthroughClient().client, timeZone: "Europe/London"});
    fireEvent.click(within(await screen.findByRole("radiogroup", {name: copy.time})).getByRole("radio", {name: "4:00 PM"}));
    expect(screen.getByText("That’s 10:30 AM your time (Europe/London).")).toBeTruthy();
  });

  it("asks for a time before the details", async () => {
    render({client: scriptedWalkthroughClient().client, timeZone: null});
    fireEvent.click(await screen.findByRole("button", {name: copy.continue}));
    expect(screen.getByRole("alert").textContent).toBe(copy.pickTime);
  });

  it("books the picked time for the verified number and says what happens next", async () => {
    const {client, calls} = scriptedWalkthroughClient();
    render({client, timeZone: "Asia/Kolkata"});
    await pickAndContinue("Mon 23 Nov", "4:00 PM");
    const heading = await screen.findByRole("heading", {name: copy.details.title});
    await waitFor(() => expect(document.activeElement).toBe(heading));
    expect(screen.getByText("Mon 23 Nov, 4:00 PM IST")).toBeTruthy();
    expect(await screen.findByText(`Booking for ${walkthroughFixturePhone}`)).toBeTruthy();
    expect(screen.queryByRole("textbox", {name: /weekday time/u})).toBeNull();
    fillDetails();
    fireEvent.click(screen.getByRole("button", {name: copy.phone.book}));
    const done = await screen.findByRole("heading", {name: "You’re booked for Mon 23 Nov, 4:00 PM IST."});
    await waitFor(() => expect(document.activeElement).toBe(done));
    expect(screen.getByText(copy.done.next)).toBeTruthy();
    // The manage link carries the booking's id and, in its fragment, the token this booking was made with.
    expect(screen.getByText(copy.done.manageLead)).toBeTruthy();
    const manage = screen.getByRole("link", {name: copy.done.manage});
    expect(manage.getAttribute("href")).toBe(`/start/walkthrough/manage?booking=${walkthroughFixtureBookingId}#t=${calls.book[0]?.manageToken}`);
    expect(screen.getByText(new RegExp(`on WhatsApp, at \\${walkthroughFixturePhone}`, "u"))).toBeTruthy();
    expect(calls.book).toHaveLength(1);
    const [sent] = calls.book;
    expect(sent).toMatchObject({
      slotStartAt: "2026-11-23T10:30:00.000Z",
      consent: {purpose: "leadFollowUp", version: playbookCopy.leadForm.consentVersion},
      name: "Asha Rivera",
      details: {organisation: "Harbour Lane Studio", whatYouRun: "Pottery evenings"},
      entry: form.id,
      sourcePage: "/",
    });
    expect(sent.requestId).toMatch(/^web_[a-f0-9]{32}$/u);
    expect(sent.manageToken).toMatch(/^[A-Za-z0-9_-]{43}$/u);
    expect(sent).not.toHaveProperty("phone");
  });

  it("checks the details before booking", async () => {
    const {client, calls} = scriptedWalkthroughClient();
    render({client, timeZone: "Asia/Kolkata"});
    await pickAndContinue("Tue 24 Nov", "11:00 AM");
    fireEvent.click(await screen.findByRole("button", {name: copy.phone.book}));
    expect(screen.getByText(copy.details.nameRequired)).toBeTruthy();
    expect(screen.getByText(copy.details.organisationRequired)).toBeTruthy();
    expect(calls.book).toHaveLength(0);
  });

  it("asks a signed-out visitor to confirm their number with a code before booking", async () => {
    const {client, calls} = scriptedWalkthroughClient({caller: null});
    render({client, timeZone: "Asia/Kolkata"});
    await pickAndContinue("Mon 23 Nov", "10:00 AM");
    expect(await screen.findByText(copy.phone.lead)).toBeTruthy();
    fillDetails();
    fireEvent.click(screen.getByRole("button", {name: copy.phone.confirmAndBook}));
    expect(await screen.findByText(signInCopy.title)).toBeTruthy();
    expect(calls.book).toHaveLength(0);
  });

  it("reloads the slots and says so when the time was taken meanwhile", async () => {
    // StrictMode reads the slots twice on mount, so the calendar changes when the booking is refused, not by call count.
    let taken = false;
    const {client, calls} = scriptedWalkthroughClient({
      slots: [() => taken ? walkthroughSlotsAfterTaken : walkthroughOpenSlots],
      book: [() => {taken = true; return walkthroughRefusal("already-exists", "slot_taken");}],
    });
    render({client, timeZone: "Asia/Kolkata"});
    await pickAndContinue("Mon 23 Nov", "10:00 AM");
    fillDetails();
    fireEvent.click(await screen.findByRole("button", {name: copy.phone.book}));
    expect((await screen.findByRole("alert")).textContent).toBe(copy.problems.slotTaken);
    expect(within(timeGroup()).getAllByRole("radio").map((radio) => radio.textContent)).toEqual(["10:30 AM", "4:00 PM"]);
    expect(within(dayGroup()).getByRole("radio", {name: "Mon 23 Nov"}).getAttribute("aria-checked")).toBe("true");
    expect(calls.book).toHaveLength(1);
  });

  it("shows the request form when no time is open", async () => {
    render({client: scriptedWalkthroughClient({slots: [walkthroughNoSlots]}).client});
    expect(await screen.findByText(copy.problems.noSlots)).toBeTruthy();
    expect(screen.getByText(fallbackText)).toBeTruthy();
    expect(screen.queryByRole("radiogroup")).toBeNull();
  });

  it("shows the request form when staff closed booking", async () => {
    render({client: scriptedWalkthroughClient({slots: [walkthroughBookingClosed]}).client});
    expect(await screen.findByText(copy.problems.bookingClosed)).toBeTruthy();
    expect(screen.getByText(fallbackText)).toBeTruthy();
  });

  it("offers a retry and the request form when the slots cannot be read", async () => {
    let reachable = false;
    const {client} = scriptedWalkthroughClient({slots: [() => reachable ? walkthroughOpenSlots : walkthroughRefusal("unavailable")]});
    render({client});
    expect(await screen.findByText(copy.problems.loadFailed)).toBeTruthy();
    expect(screen.getByText(fallbackText)).toBeTruthy();
    reachable = true;
    fireEvent.click(screen.getByRole("button", {name: copy.retry}));
    expect(await screen.findByRole("radiogroup", {name: copy.day})).toBeTruthy();
    expect(screen.queryByText(fallbackText)).toBeNull();
  });

  it("keeps the same request when a booking that did not go through is tried again", async () => {
    const {client, calls} = scriptedWalkthroughClient({book: [walkthroughRefusal("unavailable")]});
    render({client, timeZone: "Asia/Kolkata"});
    await pickAndContinue("Mon 23 Nov", "10:30 AM");
    fillDetails();
    fireEvent.click(await screen.findByRole("button", {name: copy.phone.book}));
    expect((await screen.findByRole("alert")).textContent).toBe(copy.problems.offline);
    fireEvent.click(screen.getByRole("button", {name: copy.phone.book}));
    await waitFor(() => expect(calls.book).toHaveLength(2));
    expect(calls.book[1].requestId).toBe(calls.book[0].requestId);
    expect(calls.book[1].manageToken).toBe(calls.book[0].manageToken);
  });

  it("says when the number already holds a walkthrough", async () => {
    const {client} = scriptedWalkthroughClient({book: [walkthroughRefusal("failed-precondition", "has_upcoming_booking",
      {bookingId: `wt-${"b2".repeat(20)}`, managePath: `/start/walkthrough/manage?booking=wt-${"b2".repeat(20)}`})]});
    render({client, timeZone: "Asia/Kolkata"});
    await pickAndContinue("Mon 23 Nov", "10:30 AM");
    fillDetails();
    fireEvent.click(await screen.findByRole("button", {name: copy.phone.book}));
    const alert = await screen.findByRole("alert");
    expect(within(alert).getByText(copy.problems.hasUpcoming)).toBeTruthy();
    expect(within(alert).getByRole("link", {name: copy.done.manage}).getAttribute("href"))
      .toBe(`/start/walkthrough/manage?booking=wt-${"b2".repeat(20)}`);
  });

  it("goes back to the times from the details", async () => {
    render({client: scriptedWalkthroughClient().client, timeZone: "Asia/Kolkata"});
    await pickAndContinue("Tue 24 Nov", "11:00 AM");
    fireEvent.click(await screen.findByRole("button", {name: copy.changeTime}));
    const heading = await screen.findByRole("heading", {name: copy.title});
    await waitFor(() => expect(document.activeElement).toBe(heading));
    expect(within(dayGroup()).getByRole("radio", {name: "Tue 24 Nov"}).getAttribute("aria-checked")).toBe("true");
    expect(within(timeGroup()).getByRole("radio", {name: "11:00 AM"}).getAttribute("aria-checked")).toBe("true");
  });
});
