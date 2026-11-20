import {cleanup, fireEvent, render, screen, within} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";
import {citiesPageCopy} from "@content/citiesPage";
import {interpolateContent as fill} from "@content/interpolate";
import {nightPlanTryItCopy} from "@content/nightPlanTryIt";
import {websiteCities} from "@content/markets";
import {playbookCopy} from "@content/playbook/playbookCopy";
import {websiteLeadCopy} from "@content/websiteLead";
import {loadPlaybookPage, resolvePlaybookPage} from "./playbookPages";
import {PlaybookPage} from "./PlaybookPage";
import {playbookStructuredData} from "./playbookStructuredData";
import {playbookTryItTool} from "../tryIt/tryItModel";

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

  it("sends the trial to /host/start/, and WhatsApp to a typed chat in a new tab", () => {
    render(<PlaybookPage captures={captures} page={page} />);
    const hero = within(document.getElementById("top")!);
    expect(hero.getByRole("link", {name: "Start free trial"}).getAttribute("href")).toBe("/host/start/");
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

  it("sends the run club setup guide request from the closing band, beside the trial, and retries the same request", async () => {
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
    expect(band.getByText("Start the free trial, or leave your number and we’ll send the run club setup guide on WhatsApp.")).toBeTruthy();
    expect(band.getByRole("link", {name: "Start free trial"})).toBeTruthy();
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

  it("draws a band whose form renders without a duplicate WhatsApp action: the venues list-your-space split and closing band", async () => {
    const venues = (await loadPlaybookPage(resolvePlaybookPage("/host/venues/")!))!;
    render(<PlaybookPage captures={captures} page={venues} />);
    for (const [id, submit] of [["list-your-space", "List my space"], ["start", "Send the guide"]]) {
      const band = within(document.getElementById(id)!);
      expect(band.getByRole("form", {name: submit})).toBeTruthy();
      const chats = band.queryAllByRole("link").filter((link) => /^https:\/\/wa\.me\//u.test(link.getAttribute("href") ?? ""));
      expect(chats).toEqual([]);
    }
  });

  it("asks for a walkthrough on its request page: the minimal header with WhatsApp beside it, and a walkthrough lead", async () => {
    const walkthrough = (await loadPlaybookPage(resolvePlaybookPage("/host/walkthrough/")!))!;
    const posts: {requestKind: string; fullName: string; lead: {entry: string; walkthrough: unknown}}[] = [];
    vi.stubGlobal("fetch", vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      posts.push(JSON.parse(String(init?.body)));
      return new Response(JSON.stringify({ok: true, alreadyJoined: false, lead: {leadId: "0".repeat(64), requestKind: "walkthrough", isNew: true}}), {status: 200});
    }));
    render(<PlaybookPage captures={captures} page={walkthrough} />);
    expect(screen.getByRole("heading", {level: 1}).textContent).toBe("Book a 15-minute walkthrough.");
    expect(screen.queryByRole("navigation", {name: /breadcrumb/iu})).toBeNull();
    expect(within(screen.getByRole("banner")).getByRole("link", {name: "WhatsApp us"}).getAttribute("href")).toMatch(/^https:\/\/wa\.me\/\d+\?text=/u);
    const form = within(screen.getByRole("form", {name: "Book my walkthrough"}));
    fireEvent.click(form.getByRole("button", {name: "Book my walkthrough"}));
    expect(await form.findByText(playbookCopy.leadForm.required.preferredTime)).toBeTruthy();
    expect(posts).toHaveLength(0);
    for (const [name, value] of [[/Your name/u, "Asha Rao"], [/Organisation/u, "Sunday Runners"], [/What you run/u, "A run club, three chapters"],
      [/A weekday time/u, "Tue 4pm"], [/WhatsApp number/u, "98765 43210"]] as const) {
      fireEvent.change(form.getByRole("textbox", {name}), {target: {value}});
    }
    fireEvent.click(form.getByRole("button", {name: "Book my walkthrough"}));
    expect(await screen.findByText(playbookCopy.leadForm.sent.walkthrough)).toBeTruthy();
    expect(posts).toHaveLength(1);
    expect(posts[0]).toMatchObject({requestKind: "walkthrough", fullName: "Asha Rao", lead: {entry: "walkthrough_request",
      walkthrough: {preferredTime: "Tue 4pm", organisation: "Sunday Runners", whatYouRun: "A run club, three chapters"}}});
  });

  it("sends every walkthrough action on the host pages to the request page, not WhatsApp", async () => {
    for (const path of ["/host/run-clubs/", "/host/brands/", "/host/demo/", "/how-it-works/"]) {
      const host = (await loadPlaybookPage(resolvePlaybookPage(path)!))!;
      const {unmount} = render(<PlaybookPage captures={captures} page={host} />);
      const main = within(screen.getByRole("main"));
      const walkthroughs = main.getAllByRole("link", {name: /walkthrough/iu});
      expect(walkthroughs.length, path).toBeGreaterThan(0);
      for (const link of walkthroughs) expect(link.getAttribute("href"), path).toBe("/host/walkthrough/");
      unmount();
    }
  });

  it("draws About's cities band from the market catalog: an open city links its page, the rest the launch notice", async () => {
    const about = (await loadPlaybookPage(resolvePlaybookPage("/about/")!))!;
    render(<PlaybookPage captures={captures} page={about} />);
    const band = within(document.getElementById("where")!);
    const listed = websiteCities.filter((city) => city.status !== "paused");
    expect(band.getAllByRole("heading", {level: 3}).map((heading) => heading.textContent)).toEqual(listed.map((city) => city.label));
    for (const city of listed) {
      const live = city.status === "live";
      const links = band.getAllByRole("link", {name: live ? citiesPageCopy.seeWhatsOn : citiesPageCopy.getNotified});
      expect(links.map((link) => link.getAttribute("href"))).toContain(live ? `/${city.slug}/` : `/?city=${city.slug}#whats-on`);
    }
  });

  it("starts the trial on its own page: the minimal header, a QR code of the page and the host app's store badges", async () => {
    const start = (await loadPlaybookPage(resolvePlaybookPage("/host/start/")!))!;
    render(<PlaybookPage captures={captures} page={start} />);
    expect(screen.getByRole("heading", {level: 1}).textContent).toBe("Start your free trial.");
    expect(screen.queryByRole("navigation", {name: /breadcrumb/iu})).toBeNull();
    expect(screen.getByRole("img", {name: /Scan to get/u})).toBeTruthy();
    const band = within(document.getElementById("get-app")!);
    expect(band.getByRole("link", {name: "Download on the App Store"}).getAttribute("href")).toMatch(/^https:\/\/apps\.apple\.com\//u);
    expect(band.getByRole("link", {name: "Book a 15-minute walkthrough"}).getAttribute("href")).toBe("/host/walkthrough/");
  });

  it("draws a product page's live bands only: no try-it band or button, and the host footer", async () => {
    const event = (await loadPlaybookPage(resolvePlaybookPage("/product/running-the-event/")!))!;
    render(<PlaybookPage captures={captures} page={event} />);
    expect(screen.getByRole("heading", {level: 1}).textContent).toBe("Everything behind the scenes, on one screen.");
    expect(document.getElementById("try")).toBeNull();
    expect(document.getElementById("start-try")).toBeNull();
    expect(document.getElementById("safety")).toBeNull();
    expect(screen.queryByRole("link", {name: "Get your door ready"})).toBeNull();
    expect(screen.queryByText(/mutual/iu)).toBeNull();
    const footer = within(screen.getByRole("contentinfo"));
    expect(footer.getByRole("link", {name: "The room"}).getAttribute("href")).toBe("/product/the-room/");
    expect(footer.getByRole("link", {name: "Running the event"}).getAttribute("href")).toBe("/product/running-the-event/");
    expect(footer.getByRole("link", {name: "Forms"}).getAttribute("href")).toBe("/product/forms/");
    expect(footer.getByRole("link", {name: "Report or remove a listing"}).getAttribute("href")).toBe("/listings/request/");
    expect(footer.getByRole("button", {name: /privacy choices/iu})).toBeTruthy();
    const faq = (playbookStructuredData(event, "/product/running-the-event/", "https://example.test") as {"@graph": {"@type": string; mainEntity?: unknown[]}[]})["@graph"]
      .find((node) => node["@type"] === "FAQPage")!;
    expect(faq.mainEntity).toHaveLength(6);
  });

  it("draws The room's plan-a-night band, the hero button to it and its closing band, while unbuilt missions stay out", async () => {
    const room = (await loadPlaybookPage(resolvePlaybookPage("/product/the-room/")!))!;
    render(<PlaybookPage captures={captures} page={room} />);
    const band = document.getElementById("try");
    expect(band).not.toBeNull();
    expect(screen.getByRole("link", {name: "Plan your first hello"}).getAttribute("href")).toBe("#try");
    expect(within(document.getElementById("start")!).getByRole("link", {name: "Plan my night"}).getAttribute("href")).toBe("#try");
    expect(document.getElementById("start-try")).toBeNull();
    expect(document.getElementById("first-hello-missions")).toBeNull();
    expect(document.getElementById("questions-coming")).toBeNull();
    // The tool draws in the band once night.plan is website-ready (features/tryIt/tryItModel.ts).
    if (playbookTryItTool("product_room")) expect(within(band!).getByRole("form", {name: nightPlanTryItCopy.title})).toBeTruthy();
  });

  it("gives an organiser type page the same host footer and For hosts menu as the product pages", () => {
    render(<PlaybookPage captures={captures} page={page} />);
    const footer = within(screen.getByRole("contentinfo"));
    expect(footer.getByRole("link", {name: "The room"}).getAttribute("href")).toBe("/product/the-room/");
    expect(footer.getByRole("link", {name: "Supper clubs"}).getAttribute("href")).toBe("/host/supper-clubs/");
    expect(footer.getByRole("link", {name: "Report or remove a listing"}).getAttribute("href")).toBe("/listings/request/");
    expect(footer.getByRole("button", {name: /privacy choices/iu})).toBeTruthy();
    const forHosts = within(screen.getByRole("banner")).getByRole("button", {name: "For hosts"});
    const menu = within(document.getElementById(forHosts.getAttribute("aria-controls")!)!);
    expect(menu.getByRole("link", {name: "Workshops and classes", hidden: true}).getAttribute("href")).toBe("/host/workshops/");
  });

  it("states its questions as FAQPage and its breadcrumb as BreadcrumbList", () => {
    const data = playbookStructuredData(page, "/host/run-clubs/", "https://example.test") as {"@graph": {"@type": string; mainEntity?: unknown[]; itemListElement?: {item: string}[]}[]};
    const faq = data["@graph"].find((node) => node["@type"] === "FAQPage")!;
    expect(faq.mainEntity).toHaveLength(6);
    const crumbs = data["@graph"].find((node) => node["@type"] === "BreadcrumbList")!;
    expect(crumbs.itemListElement!.map((item) => item.item)).toEqual(["https://example.test/", "https://example.test/host/", "https://example.test/host/run-clubs/"]);
  });
});
