import {expect, userEvent, waitFor, within} from "storybook/test";
import type {Meta, StoryObj} from "@storybook/react-vite";

import {PublicSiteFooter, PublicSiteHeader, WebsitePageMain} from "../shared/site";

const publicRouteIds = ["home", "visitor_discovery", "host", "claim", "claim_lookup", "privacy", "terms", "help", "not_found", "organizer_search", "organizer_listing_canonical", "organizer_listing_legacy", "event_detail_canonical", "host_apply"];
const meta = {title: "Marketing Website/Shared/Public site chrome", component: PublicSiteHeader} satisfies Meta<typeof PublicSiteHeader>;
export default meta;
type Story = StoryObj<typeof meta>;

export const PublicSiteHeaderStory: Story = {
  parameters: {catchComponent: {id: "shared_public_site_header", routeIds: publicRouteIds,
    states: ["global-navigation"]}},
  play: exerciseHeaderContrast,
  render: () => <>
    <PublicSiteHeader />
    <WebsitePageMain>
      <section><h1>Organiser profile</h1><p>Browse this organiser&apos;s events.</p></section>
    </WebsitePageMain>
  </>,
};

export const PublicSiteFooterStory: Story = {
  parameters: {catchComponent: {id: "shared_public_site_footer", routeIds: publicRouteIds,
    states: ["global-links"]}},
  render: () => <PublicSiteFooter />,
};

// WCAG contrast from rendered colors, including transparent ancestor surfaces.
function contrastRatio(element: HTMLElement, foreground = getComputedStyle(element).color) {
  const context = document.createElement("canvas").getContext("2d")!;
  const rgba = (color: string) => {
    context.clearRect(0, 0, 1, 1);
    context.fillStyle = color;
    context.fillRect(0, 0, 1, 1);
    return Array.from(context.getImageData(0, 0, 1, 1).data);
  };
  const blend = (front: number[], back: number[]) =>
    back.map((value, index) => front[index] * front[3] / 255 + value * (1 - front[3] / 255));
  const ancestors: HTMLElement[] = [];
  for (let node: HTMLElement | null = element; node; node = node.parentElement) ancestors.push(node);
  let background = [255, 255, 255];
  for (const node of ancestors.reverse()) background = blend(rgba(getComputedStyle(node).backgroundColor), background);
  const luminance = (rgb: number[]) => rgb.map((value) => {
    const channel = value / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  }).reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
  const ink = luminance(blend(rgba(foreground), background));
  const surface = luminance(background);
  return (Math.max(ink, surface) + 0.05) / (Math.min(ink, surface) + 0.05);
}

async function exerciseHeaderContrast({canvasElement}: {canvasElement: HTMLElement}) {
  const trigger = canvasElement.querySelector<HTMLButtonElement>(".site-menu-button")!;
  const dialog = canvasElement.querySelector<HTMLElement>(".site-menu")!;
  const consent = localStorage.getItem("catch_marketing_consent_v4");
  const overflow = document.body.style.overflow;
  const scroll = {left: window.scrollX, top: window.scrollY};
  for (const exit of ["Escape", "Close", "Escape"]) {
    // Open the same modal fixture even in a desktop Storybook canvas where its
    // responsive trigger is hidden; real mobile pointer entry is browser-tested.
    trigger.click();
    await waitFor(() => expect(dialog).toBeVisible());
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    const menu = within(dialog);
    const close = menu.getByRole("button", {name: "Close"});
    await expect(close).toHaveFocus();
    const actions = menu.getAllByRole("link");
    for (const action of actions) {
      // Park the pointer on Close: the stacked menu links leave no gap for an unhover.
      await hoverAction(close);
      await expect(action.matches(":hover")).toBe(false);
      await expect(contrastRatio(action)).toBeGreaterThanOrEqual(4.5);
      await hoverAction(action);
      await expect(contrastRatio(action)).toBeGreaterThanOrEqual(4.5);
      await userEvent.tab();
      action.focus();
      await Promise.all(action.getAnimations().map((animation) => animation.finished));
      await expect(action).toHaveFocus();
      await expect(action.matches(":focus-visible")).toBe(true);
      const style = getComputedStyle(action);
      await expect(style.outlineStyle).toBe("solid");
      await expect(parseFloat(style.outlineWidth)).toBeGreaterThanOrEqual(2);
      await expect(contrastRatio(dialog, style.outlineColor)).toBeGreaterThanOrEqual(3);
      await expect(contrastRatio(action)).toBeGreaterThanOrEqual(4.5);
    }
    for (const hint of dialog.querySelectorAll<HTMLElement>(".site-menu__hint")) {
      await expect(contrastRatio(hint)).toBeGreaterThanOrEqual(4.5);
    }
    close.focus();
    await userEvent.tab({shift: true});
    await expect(actions[actions.length - 1]).toHaveFocus();
    await userEvent.tab();
    await expect(close).toHaveFocus();
    if (exit === "Escape") await userEvent.keyboard("{Escape}");
    else await userEvent.click(close);
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await expect(dialog).toHaveAttribute("inert");
    await expect(document.body.style.overflow).toBe(overflow);
    if (getComputedStyle(trigger).display !== "none") await expect(trigger).toHaveFocus();
    await expect(localStorage.getItem("catch_marketing_consent_v4")).toBe(consent);
  }
  trigger.blur();
  window.scrollTo({...scroll, behavior: "instant"});
}

async function hoverAction(action: HTMLElement, hover = true) {
  // Chromium tests use the provider's real pointer so CSS :hover is exercised.
  // Interactive Storybook keeps its portable event API outside Browser Mode.
  const events = import.meta.env.MODE === "test"
    // Resolve context types from this surface's provider, not hoisted Vitest's optional peers.
    ? (await import("vitest/browser") as typeof import("@vitest/browser-playwright/context")).userEvent
    : userEvent;
  if (hover) await events.hover(action);
  else await events.unhover(action);
  await Promise.all(action.getAnimations().map((animation) => animation.finished));
  if (import.meta.env.MODE === "test") await expect(action.matches(":hover")).toBe(hover);
}
