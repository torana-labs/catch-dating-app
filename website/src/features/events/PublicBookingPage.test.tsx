import {cleanup, render, screen, waitFor} from "@testing-library/react";
import {MemoryRouter, Route, Routes} from "react-router";
import {afterEach, expect, it, vi} from "vitest";

vi.mock("./GuestEventEntry", () => ({GuestEventEntry: ({eventId}: {eventId: string}) => <p>{`Booking steps for ${eventId}`}</p>}));
vi.mock("./PublicPaidEventRegistration", () => ({
  PublicPaidEventRegistration: ({eventId, initialPaymentId, allowNewBookings}: {
    eventId: string; initialPaymentId: string; allowNewBookings: boolean;
  }) => <p>{`Receipt ${eventId}:${initialPaymentId}:${allowNewBookings}`}</p>,
}));

import {PublicBookingPage} from "./PublicBookingPage";

const paymentId = `pp_${"a".repeat(32)}`;

function renderBooking(path: string, exists: boolean) {
  const pageExists = vi.fn(async () => exists);
  const redirect = vi.fn();
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/booking/:eventId" element={<PublicBookingPage pageExists={pageExists} redirect={redirect} />} />
      </Routes>
    </MemoryRouter>
  );
  return {pageExists, redirect};
}

afterEach(cleanup);

it("sends the old booking link to the event page, whose booking card does its job", async () => {
  const {pageExists, redirect} = renderBooking("/booking/salt-air-15k/", true);
  await waitFor(() => expect(redirect).toHaveBeenCalledWith("/events/salt-air-15k/"));
  expect(pageExists).toHaveBeenCalledWith("/events/salt-air-15k/");
  expect(screen.queryByText("Booking steps for salt-air-15k")).toBeNull();
});

it("keeps the booking steps here, with no event detail, when the event has no public page", async () => {
  const {redirect} = renderBooking("/booking/withdrawn-event/", false);
  expect(await screen.findByText("Booking steps for withdrawn-event")).toBeTruthy();
  expect(redirect).not.toHaveBeenCalled();
  expect(screen.getByRole("heading", {level: 1}).textContent).toBe("Your event booking");
});

it("keeps a payment receipt here, private, even while the event page exists", async () => {
  const {pageExists, redirect} = renderBooking(`/booking/salt-air-15k/?payment=${paymentId}`, true);
  expect(screen.getByText(`Receipt salt-air-15k:${paymentId}:false`)).toBeTruthy();
  await Promise.resolve();
  expect(pageExists).not.toHaveBeenCalled();
  expect(redirect).not.toHaveBeenCalled();
});

it("refuses a malformed payment or event without checking anything", async () => {
  const malformed = renderBooking("/booking/salt-air-15k/?payment=pp_nope", true);
  expect(screen.getByRole("status").textContent).toContain("Registration is unavailable");
  await Promise.resolve();
  expect(malformed.pageExists).not.toHaveBeenCalled();
  cleanup();
  const badEvent = renderBooking("/booking/bad%20id/", true);
  expect(screen.getByRole("status").textContent).toContain("Registration is unavailable");
  expect(badEvent.redirect).not.toHaveBeenCalled();
});
