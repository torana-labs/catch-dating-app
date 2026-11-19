import {cleanup, fireEvent, render, screen, waitFor} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";
import {homePageCopy} from "@content/homePage";
import {websiteCities} from "@content/markets";
import {AppLaunchNotice} from "./AppLaunchNotice";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const notify = homePageCopy.app.notify;

function stubWaitlist() {
  const fetch = vi.fn(async (_url: string, _init: RequestInit) => new Response(JSON.stringify({ok: true, alreadyJoined: false}), {status: 200}));
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

describe("AppLaunchNotice", () => {
  it("sends the homepage's app-launch notice: one message on launch, the same consent version, new plans off unless ticked", async () => {
    const fetch = stubWaitlist();
    render(<AppLaunchNotice ground="paper" id="notify" labels={{city: "Your city"}} title="One message, the day it launches." />);
    fireEvent.change(screen.getByRole("textbox", {name: notify.phone}), {target: {value: "98765 43210"}});
    fireEvent.click(screen.getByRole("button", {name: notify.action}));
    await waitFor(() => expect(screen.getByRole("status").textContent).toBe(notify.joined));
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe("/api/join-waitlist");
    const body = JSON.parse(String(init.body));
    const first = websiteCities.find((city) => city.status === "live")!;
    expect(body).toMatchObject({
      role: "member",
      city: first.label,
      cityId: first.id,
      whatsapp: {phone: "+919876543210", launchNotice: true, notice: "appLaunch", newPlans: false, marketing: false, consentVersion: "app-launch-whatsapp-v1"},
    });
    expect(body.citySource).toBeUndefined();
  });

  it("asks for the city the visitor picks, and says it was picked", async () => {
    const fetch = stubWaitlist();
    render(<AppLaunchNotice ground="paper" id="notify" labels={{city: "Your city"}} />);
    const second = websiteCities.filter((city) => city.status !== "paused")[1];
    fireEvent.change(screen.getByRole("combobox", {name: "Your city"}), {target: {value: second.slug}});
    expect(screen.getByRole("checkbox", {name: notify.newPlans.replace("{city}", second.label)})).toBeTruthy();
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.change(screen.getByRole("textbox", {name: notify.phone}), {target: {value: "9876543210"}});
    fireEvent.click(screen.getByRole("button", {name: notify.action}));
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    const body = JSON.parse(String(fetch.mock.calls[0][1].body));
    expect(body).toMatchObject({city: second.label, cityId: second.id, citySource: "picked", whatsapp: {newPlans: true, notice: "appLaunch"}});
  });

  it("shows the consent line and refuses a number it cannot read, without sending", () => {
    const fetch = stubWaitlist();
    render(<AppLaunchNotice ground="paper" id="notify" labels={{city: "Your city"}} />);
    expect(screen.getByText(notify.consent)).toBeTruthy();
    fireEvent.change(screen.getByRole("textbox", {name: notify.phone}), {target: {value: "12"}});
    fireEvent.click(screen.getByRole("button", {name: notify.action}));
    expect(screen.getByText(notify.invalidPhone)).toBeTruthy();
    expect(fetch).not.toHaveBeenCalled();
  });
});
