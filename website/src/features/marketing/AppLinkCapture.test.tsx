import {cleanup, fireEvent, render, screen, within} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";
import {appLinkCopy} from "@content/appDownload";
import {websiteLeadCopy} from "@content/websiteLead";
import {isJoinWaitlistHttpRequest} from "../../shared/api/joinWaitlistContract";
import {websiteLeadRequest} from "../../shared/api/websiteLead";
import {AppLinkCapture} from "./AppLinkCapture";
import {appLinkLeadRequest} from "./useAppLinkCaptureController";

vi.mock("../../firebase", () => ({getWebsiteAppCheckToken: vi.fn(async () => "site-token")}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.history.replaceState(null, "", "/");
});

type Posted = {requestKind: string; fullName?: string; lead: {requestId: string; entry: string; sourcePage: string; appLink: unknown; consent: unknown}};

describe("AppLinkCapture", () => {
  it("files a host app link lead with the number alone, under its own consent version", () => {
    const lead = appLinkLeadRequest("98765 43210", "/host/", "host_app_link");
    expect(lead).toEqual({kind: "app_link", phone: "98765 43210", consentVersion: appLinkCopy.consentVersion, sourcePage: "/host/",
      entry: "host_app_link", answers: {app: "host"}});
    const body = websiteLeadRequest(lead, "+919876543210", "a".repeat(32));
    expect(body).toMatchObject({requestKind: "app_link", lead: {consent: {purpose: "leadFollowUp", version: "app-link-whatsapp-v1"},
      appLink: {app: "host"}}});
    expect(body).not.toHaveProperty("fullName");
    expect(isJoinWaitlistHttpRequest(body)).toBe(true);
  });

  it("asks for a mobile number, shows the short line with the privacy policy, retries the same request and then thanks", async () => {
    const posts: Posted[] = [];
    const answers = [
      new Response(JSON.stringify({error: "Unavailable"}), {status: 503}),
      new Response(JSON.stringify({ok: true, alreadyJoined: false, lead: {leadId: "0".repeat(64), requestKind: "app_link", isNew: true}}), {status: 200}),
    ];
    vi.stubGlobal("fetch", vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      posts.push(JSON.parse(String(init?.body)));
      return answers.shift()!;
    }));
    window.history.replaceState(null, "", "/host/");
    render(<AppLinkCapture />);
    const form = within(screen.getByRole("form", {name: appLinkCopy.submit}));
    expect(form.getByText(appLinkCopy.consent)).toBeTruthy();
    expect(appLinkCopy.consent).toBe("On WhatsApp, from Catch.");
    expect(form.getByRole("link", {name: appLinkCopy.privacy}).getAttribute("href")).toBe("/privacy/");

    fireEvent.click(form.getByRole("button", {name: appLinkCopy.submit}));
    expect(await form.findByText(websiteLeadCopy.problems.invalid_phone)).toBeTruthy();
    expect(posts).toHaveLength(0);

    fireEvent.change(form.getByRole("textbox", {name: new RegExp(appLinkCopy.label, "u")}), {target: {value: "98765 43210"}});
    fireEvent.click(form.getByRole("button", {name: appLinkCopy.submit}));
    expect(await screen.findByText(websiteLeadCopy.problems.failed)).toBeTruthy();
    fireEvent.click(form.getByRole("button", {name: appLinkCopy.retry}));
    expect(await screen.findByText(appLinkCopy.sent)).toBeTruthy();
    expect(screen.queryByRole("form", {name: appLinkCopy.submit})).toBeNull();

    expect(posts).toHaveLength(2);
    expect(posts[1].lead.requestId).toBe(posts[0].lead.requestId);
    expect(posts[0]).toMatchObject({requestKind: "app_link", lead: {entry: "host_app_link", sourcePage: "/host/", appLink: {app: "host"},
      consent: {purpose: "leadFollowUp", version: appLinkCopy.consentVersion}}});
  });
});
