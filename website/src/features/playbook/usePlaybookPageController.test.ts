import {renderHook} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";
import {brand} from "@content/brand";
import runClubs from "@content/playbook/pages/host/run-clubs.json";
import {validatedPlaybookPage, type PlaybookAction, type PlaybookPageDocument} from "@content/playbook/playbookContract";
import {playbookCtaLabel, usePlaybookPageController} from "./usePlaybookPageController";

const tracked = vi.hoisted(() => [] as {label: string; href: string}[]);
vi.mock("../../shared/site/siteTracking", () => ({
  slugForTracking: (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, ""),
  trackSiteCtaClick: (label: string, href: string) => tracked.push({label, href}),
}));

afterEach(() => {
  tracked.length = 0;
});

// The run-clubs page supplies every label, so the test types no copy of its own.
const page: PlaybookPageDocument = validatedPlaybookPage(runClubs);
const hero = page.sections.find((section) => section.type === "hero")!;
const cta = page.sections.find((section) => section.type === "cta")!;
const [trialAction, whatsappAction] = hero.actions as readonly PlaybookAction[];
const form = cta.type === "cta" ? cta.leadForm! : undefined!;

describe("usePlaybookPageController", () => {
  it("links site routes, playbook pages, family pages and anchors, and tags each press with the page and section", () => {
    const {result} = renderHook(() => usePlaybookPageController(page));
    const controller = result.current;
    expect(controller.href({route: "host"})).toBe("/host/");
    expect(controller.href({route: "host", anchor: "faq"})).toBe("/host/#faq");
    expect(controller.href({route: "host_start"})).toBe("/host/start/");
    expect(controller.href({route: "host_run_clubs"})).toBe("/host/run-clubs/");
    expect(controller.href({page: "story_detail/carter-road", anchor: "quote"})).toBe("/stories/carter-road/#quote");
    expect(controller.href({anchor: "pricing"})).toBe("#pricing");
    expect(() => controller.href({route: "story_detail"})).toThrow(/no single page/u);

    expect(trialAction.to).toEqual({route: "host_start"});
    const trial = controller.action(trialAction, "top");
    expect(trial).toMatchObject({label: trialAction.label, href: "/host/start/", newTab: false, variant: "primary"});
    trial.onPressed?.();
    expect(tracked).toEqual([{label: playbookCtaLabel(page.id, "top", trialAction.label), href: "/host/start/"}]);
    expect(tracked[0].label).toMatch(/^playbook_host_run_clubs_top_[a-z_]+$/u);
  });

  it("opens WhatsApp in a new tab on the brand's number, with the message typed", () => {
    const {result} = renderHook(() => usePlaybookPageController(page));
    const message = "kind" in whatsappAction.to ? whatsappAction.to.message : "";
    const chat = result.current.action(whatsappAction, "top");
    expect(chat.href).toBe(`https://wa.me/${brand.support.whatsapp.replace(/\D/gu, "")}?text=${encodeURIComponent(message)}`);
    expect(chat.newTab).toBe(true);
    expect(chat.variant).toBe("secondary");
    expect(result.current.actions(undefined, "top")).toBeUndefined();
    expect(result.current.link({...trialAction, to: {route: "host", anchor: "pricing"}})).toEqual({label: trialAction.label, href: "/host/#pricing"});
  });

  it("renders a lead form only from its kind's filled slot, telling it where it sits", () => {
    const empty = renderHook(() => usePlaybookPageController(page));
    expect(empty.result.current.leadForm(form, "start", "cta")).toBeNull();
    expect(empty.result.current.leadForm(undefined, "start", "cta")).toBeNull();

    const slot = vi.fn(() => "form");
    const filled = renderHook(() => usePlaybookPageController(page, {guide: slot}));
    expect(filled.result.current.leadForm(form, "start", "cta")).toBe("form");
    expect(slot).toHaveBeenCalledWith({form, pageId: "host_run_clubs", sectionId: "start", placement: "cta"});
    const other = renderHook(() => usePlaybookPageController(page, {venue: slot}));
    expect(other.result.current.leadForm(form, "start", "cta")).toBeNull();
  });
});
