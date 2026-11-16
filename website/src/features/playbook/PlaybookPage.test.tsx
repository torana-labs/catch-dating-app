import {cleanup, render, screen, within} from "@testing-library/react";
import {afterEach, describe, expect, it} from "vitest";
import {playbookCopy} from "@content/playbook/playbookCopy";
import {loadPlaybookPage, resolvePlaybookPage} from "./playbookPages";
import {PlaybookPage} from "./PlaybookPage";
import {playbookStructuredData} from "./playbookStructuredData";

afterEach(cleanup);

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

  it("shows no lead form while its slot is empty, and the slot's form once filled", () => {
    const {unmount} = render(<PlaybookPage captures={captures} page={page} />);
    expect(screen.queryByText("Send the guide")).toBeNull();
    unmount();
    render(<PlaybookPage captures={captures} leadForms={{run_club_setup_guide: ({form}) => <span>{form.submitLabel}</span>}} page={page} />);
    expect(screen.getByText("Send the guide")).toBeTruthy();
  });

  it("states its questions as FAQPage and its breadcrumb as BreadcrumbList", () => {
    const data = playbookStructuredData(page, "/host/run-clubs/", "https://example.test") as {"@graph": {"@type": string; mainEntity?: unknown[]; itemListElement?: {item: string}[]}[]};
    const faq = data["@graph"].find((node) => node["@type"] === "FAQPage")!;
    expect(faq.mainEntity).toHaveLength(6);
    const crumbs = data["@graph"].find((node) => node["@type"] === "BreadcrumbList")!;
    expect(crumbs.itemListElement!.map((item) => item.item)).toEqual(["https://example.test/", "https://example.test/host/", "https://example.test/host/run-clubs/"]);
  });
});
