import {renderHook} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";
import {brand} from "@content/brand";
import type {PlaybookPageDocument} from "@content/playbook/playbookContract";
import {usePlaybookPageController} from "./usePlaybookPageController";

const tracked = vi.hoisted(() => [] as {label: string; href: string}[]);
vi.mock("../../shared/site/siteTracking", () => ({
  slugForTracking: (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, ""),
  trackSiteCtaClick: (label: string, href: string) => tracked.push({label, href}),
}));

afterEach(() => {
  tracked.length = 0;
});

const page = {id: "host_run_clubs"} as PlaybookPageDocument;

describe("usePlaybookPageController", () => {
  it("links site routes, aliased pages, family pages and anchors, and tags each press with the page and section", () => {
    const {result} = renderHook(() => usePlaybookPageController(page));
    const controller = result.current;
    expect(controller.href({route: "host"})).toBe("/host/");
    expect(controller.href({route: "host", anchor: "faq"})).toBe("/host/#faq");
    // /host/start/ has no content yet, so its alias stands in.
    expect(controller.href({route: "host_start"})).toBe("/host/#start");
    expect(controller.href({route: "host_run_clubs"})).toBe("/host/run-clubs/");
    expect(controller.href({page: "story_detail/carter-road", anchor: "quote"})).toBe("/stories/carter-road/#quote");
    expect(controller.href({anchor: "pricing"})).toBe("#pricing");
    expect(() => controller.href({route: "story_detail"})).toThrow(/no single page/u);

    const trial = controller.action({label: "Start free trial", to: {route: "host_start"}, emphasis: "primary"}, "top");
    expect(trial).toMatchObject({label: "Start free trial", href: "/host/#start", newTab: false, variant: "primary"});
    trial.onPressed?.();
    expect(tracked).toEqual([{label: "playbook_host_run_clubs_top_start_free_trial", href: "/host/#start"}]);
  });

  it("opens WhatsApp in a new tab on the brand's number, with the message typed", () => {
    const {result} = renderHook(() => usePlaybookPageController(page));
    const chat = result.current.action({label: "Talk to us", to: {kind: "whatsapp", message: "Hi there"}}, "top");
    expect(chat.href).toBe(`https://wa.me/${brand.support.whatsapp.replace(/\D/gu, "")}?text=Hi%20there`);
    expect(chat.newTab).toBe(true);
    expect(chat.variant).toBeUndefined();
    expect(result.current.actions(undefined, "top")).toBeUndefined();
    expect(result.current.link({label: "Pricing", to: {route: "host", anchor: "pricing"}})).toEqual({label: "Pricing", href: "/host/#pricing"});
  });

  it("renders a lead form only from a filled slot, telling it where it sits", () => {
    const form = {id: "run_club_setup_guide", requestKind: "guide", label: "Your WhatsApp number", submitLabel: "Send the guide"} as const;
    const empty = renderHook(() => usePlaybookPageController(page));
    expect(empty.result.current.leadForm(form, "start")).toBeNull();
    expect(empty.result.current.leadForm(undefined, "start")).toBeNull();

    const slot = vi.fn(() => "form");
    const filled = renderHook(() => usePlaybookPageController(page, {run_club_setup_guide: slot}));
    expect(filled.result.current.leadForm(form, "start")).toBe("form");
    expect(slot).toHaveBeenCalledWith({form, pageId: "host_run_clubs", sectionId: "start"});
  });
});
