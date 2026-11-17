import {cleanup, fireEvent, render, screen, within} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";
import {interpolateContent as fill} from "@content/interpolate";
import {playbookCopy} from "@content/playbook/playbookCopy";
import {websiteLeadCopy} from "@content/websiteLead";
import {loadPlaybookPage, resolvePlaybookPage} from "./playbookPages";
import {PlaybookPage} from "./PlaybookPage";
import {playbookStructuredData} from "./playbookStructuredData";

vi.mock("../../firebase", () => ({getWebsiteAppCheckToken: vi.fn(async () => "site-token")}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const page = (await loadPlaybookPage(resolvePlaybookPage("/host/run-clubs/")!))!;
const captures = {};

describe("playbook page", () => {
  it("draws the run-clubs page: the host header with its breadcrumb, one h1, each band in order, and the site footer", () => {
    render(<PlaybookPage captures={captures} page={page} />);
    expect(screen.getByRole("banner")).toBeTruthy();
    expect(screen.getAllByRole("heading", {level: 1}).map((heading) => heading.textContent)).toEqual([page.sections[0].type === "hero" ? page.sections[0].title : ""]);
    const headings = screen.getAllByRole("heading", {level: 2}).map((heading) => heading.textContent);
    for (const title of ["Running is the easy part.", "From Thursday’s sign-ups to next Sunday.", "What to look for in a run club app.", "What run club leads ask us.", "Your next run, without the thread."]) {
      expect(headings).toContain(title);
    }
    expect(screen.getByRole("navigation", {name: /breadcrumb/iu})).toBeTruthy();
    expect(screen.getByRole("contentinfo")).toBeTruthy();
  });

  it("sends the trial to the host start band until /host/start/ ships, and WhatsApp to a typed chat in a new tab", () => {
    render(<PlaybookPage captures={captures} page={page} />);
    const hero = within(document.getElementById("top")!);
    expect(hero.getByRole("link", {name: "Start free trial"}).getAttribute("href")).toBe("/host/#start");
    const whatsapp = hero.getByRole("link", {name: "Talk to us on WhatsApp"});
    expect(whatsapp.getAttribute("href")).toMatch(/^https:\/\/wa\.me\/\d+\?text=/u);
    expect(whatsapp.getAttribute("target")).toBe("_blank");
    expect(screen.getAllByText(playbookCopy.whatsappReply, {exact: false}).length).toBeGreaterThan(0);
  });

  it("shows no lead form while its kind's slot is empty, and the slot's form once filled", () => {
    const {unmount} = render(<PlaybookPage captures={captures} leadForms={{}} page={page} />);
    expect(screen.queryByText("Send the guide")).toBeNull();
    unmount();
    render(<PlaybookPage captures={captures} leadForms={{guide: ({form}) => <span>{form.submitLabel}</span>}} page={page} />);
    expect(screen.getByText("Send the guide")).toBeTruthy();
  });

  it("sends the run club setup guide request from the closing band, beside the WhatsApp action, and retries the same request", async () => {
    const posts: {requestKind: string; lead: {requestId: string; entry: string; guide: unknown; consent: unknown}}[] = [];
    const answers = [
      new Response(JSON.stringify({error: "Unavailable"}), {status: 503}),
      new Response(JSON.stringify({ok: true, alreadyJoined: false, lead: {leadId: "0".repeat(64), requestKind: "guide", isNew: true}}), {status: 200}),
    ];
    vi.stubGlobal("fetch", vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      posts.push(JSON.parse(String(init?.body)));
      return answers.shift()!;
    }));
    render(<PlaybookPage captures={captures} page={page} />);
    const band = within(document.getElementById("start")!);
    expect(band.getByRole("link", {name: "Get the setup guide on WhatsApp"}).getAttribute("target")).toBe("_blank");
    const form = within(band.getByRole("form", {name: "Send the guide"}));
    expect(form.getByText(fill(playbookCopy.leadForm.consent, {action: "Send the guide"}))).toBeTruthy();
    expect(form.getByText("We’ll message you on WhatsApp with the guide.")).toBeTruthy();

    fireEvent.click(form.getByRole("button", {name: "Send the guide"}));
    expect(await form.findByText(websiteLeadCopy.problems.invalid_phone)).toBeTruthy();
    expect(posts).toHaveLength(0);

    fireEvent.change(form.getByRole("textbox", {name: /Your WhatsApp number/u}), {target: {value: "98765 43210"}});
    fireEvent.click(form.getByRole("button", {name: "Send the guide"}));
    expect(await band.findByText(websiteLeadCopy.problems.failed)).toBeTruthy();
    fireEvent.click(form.getByRole("button", {name: playbookCopy.leadForm.retry}));
    expect(await band.findByText(playbookCopy.leadForm.sent.guide)).toBeTruthy();
    expect(band.queryByRole("form", {name: "Send the guide"})).toBeNull();

    expect(posts).toHaveLength(2);
    expect(posts[1].lead.requestId).toBe(posts[0].lead.requestId);
    expect(posts[0]).toMatchObject({requestKind: "guide", lead: {entry: "run_club_setup_guide", guide: {format: "run_club"},
      consent: {purpose: "leadFollowUp", version: playbookCopy.leadForm.consentVersion}}});
  });

  it("states its questions as FAQPage and its breadcrumb as BreadcrumbList", () => {
    const data = playbookStructuredData(page, "/host/run-clubs/", "https://example.test") as {"@graph": {"@type": string; mainEntity?: unknown[]; itemListElement?: {item: string}[]}[]};
    const faq = data["@graph"].find((node) => node["@type"] === "FAQPage")!;
    expect(faq.mainEntity).toHaveLength(6);
    const crumbs = data["@graph"].find((node) => node["@type"] === "BreadcrumbList")!;
    expect(crumbs.itemListElement!.map((item) => item.item)).toEqual(["https://example.test/", "https://example.test/host/", "https://example.test/host/run-clubs/"]);
  });
});
