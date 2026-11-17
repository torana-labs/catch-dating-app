import {cleanup, fireEvent, render, screen, waitFor} from "@testing-library/react";
import {MemoryRouter, Route, Routes} from "react-router";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

const resolveEventInviteLanding = vi.hoisted(() => vi.fn());

vi.mock("../../firebase", () => ({
  resolveEventInviteLanding,
}));

import {brand} from "../../content/brand";
import {EventInvitePage} from "./EventInvitePage";

const landing = {
  eventId: "event-1",
  title: "Courtyard Social",
  startTimeMillis: Date.parse("2026-08-15T18:00:00.000Z"),
  endTimeMillis: Date.parse("2026-08-15T20:00:00.000Z"),
  locationName: "The Courtyard",
  destinationKind: "catchEvent" as const,
  destinationUrl: null,
  sourceLabel: "Catch",
};

function renderInvite(redirect = vi.fn(), path = "/invite/v2_link_token") {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/invite/:inviteToken" element={<EventInvitePage redirect={redirect} />} />
      </Routes>
    </MemoryRouter>
  );
  return redirect;
}

afterEach(cleanup);

describe("EventInvitePage", () => {
  beforeEach(() => {
    resolveEventInviteLanding.mockReset();
    resolveEventInviteLanding.mockResolvedValue(landing);
  });

  it("resolves an opaque token and opens the event page with it as the invitation", async () => {
    const redirect = renderInvite();
    expect(screen.getByRole("progressbar", {name: "Opening your invitation"})).toBeTruthy();
    await waitFor(() => expect(redirect).toHaveBeenCalledWith("/events/event-1/?il=v2_link_token"));
    expect(resolveEventInviteLanding).toHaveBeenCalledWith({inviteToken: "v2_link_token", sessionId: expect.any(String)});
    // The invite page shows no event detail of its own.
    expect(screen.queryByText("Courtyard Social")).toBeNull();
  });

  it("encodes the event and the token into the event page's address", async () => {
    resolveEventInviteLanding.mockResolvedValueOnce({...landing, eventId: "event 2/x"});
    const redirect = renderInvite(vi.fn(), "/invite/token%2Bwith%20space");
    await waitFor(() => expect(redirect).toHaveBeenCalledWith("/events/event%202%2Fx/?il=token%2Bwith%20space"));
  });

  it("hands external and event-mode invitations to the destination the server issued", async () => {
    resolveEventInviteLanding.mockResolvedValueOnce({...landing, destinationKind: "externalBooking",
      destinationUrl: "https://lu.ma/event?catch_ref=link-1", sourceLabel: "Luma"});
    const external = renderInvite();
    await waitFor(() => expect(external).toHaveBeenCalledWith("https://lu.ma/event?catch_ref=link-1"));
    cleanup();
    resolveEventInviteLanding.mockResolvedValueOnce({...landing, destinationKind: "eventRuntime",
      destinationUrl: `${brand.web.origin}/join/runtime-1?il=v2_link_token`});
    const runtime = renderInvite();
    await waitFor(() => expect(runtime).toHaveBeenCalledWith(`${brand.web.origin}/join/runtime-1?il=v2_link_token`));
  });

  it("fails closed for an invalid or expired token, or one with nowhere to go", async () => {
    resolveEventInviteLanding.mockRejectedValueOnce(Object.assign(new Error("not found"), {code: "functions/not-found"}));
    const rejected = renderInvite();
    expect(await screen.findByRole("heading", {name: "This invitation is unavailable"})).toBeTruthy();
    expect(screen.getByRole("link", {name: "Open help"}).getAttribute("href")).toBe("/help/");
    expect(rejected).not.toHaveBeenCalled();
    cleanup();
    resolveEventInviteLanding.mockResolvedValueOnce({...landing, destinationKind: "externalBooking", destinationUrl: null});
    const nowhere = renderInvite();
    expect(await screen.findByRole("heading", {name: "This invitation is unavailable"})).toBeTruthy();
    expect(nowhere).not.toHaveBeenCalled();
    cleanup();
    resolveEventInviteLanding.mockRejectedValueOnce(Object.assign(new Error("bad token"), {code: "functions/invalid-argument"}));
    renderInvite();
    expect(await screen.findByRole("heading", {name: "This invitation is unavailable"})).toBeTruthy();
  });

  // Regression: a resolve that failed for any reason but the server turning
  // the link down (the network, or App Check unable to start because its
  // reCAPTCHA script was blocked) called a working link unavailable, with no
  // way to try again. It now says the check did not finish and retries.
  it("offers a retry when the invitation could not be checked, and opens it once the retry resolves", async () => {
    resolveEventInviteLanding.mockRejectedValueOnce(new Error("App Check could not start in this browser."));
    const redirect = renderInvite();
    expect(await screen.findByRole("heading", {name: "We could not open this invitation"})).toBeTruthy();
    expect(screen.queryByRole("progressbar")).toBeNull();
    expect(screen.getByRole("link", {name: "Open help"}).getAttribute("href")).toBe("/help/");
    expect(redirect).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", {name: "Try again"}));
    await waitFor(() => expect(redirect).toHaveBeenCalledWith("/events/event-1/?il=v2_link_token"));
    expect(resolveEventInviteLanding).toHaveBeenCalledTimes(2);
  });
});
