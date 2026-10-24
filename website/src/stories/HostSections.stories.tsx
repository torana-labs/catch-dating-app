import {expect, userEvent, within} from "storybook/test";
import type {Meta, StoryObj} from "@storybook/react-vite";
import {HostApplicationFlow} from "../features/host/application/HostApplicationFlow";
import {HostLanding, HostLandingSection} from "../shared/ui/primitives/hostLanding";

const meta = {
  title: "Marketing Website/Host/Sections",
  parameters: {
    catchComponentRegistry: {
      path: "design/website/components.json",
    },
    catchRouteContract: {
      path: "design/website/routes.json",
    },
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const HostApplicationFlowInitial: Story = {
  name: "Host application flow · initial",
  parameters: {
    a11y: {test: "todo"},
    catchComponent: {
      id: "host_application_flow",
      routeIds: ["host_apply"],
      states: ["initial", "interactive-steps"],
    },
  },
  render: () => (
    <HostLanding>
      <HostLandingSection variant="apply" aria-label="Host application">
        <HostApplicationFlow />
      </HostLandingSection>
    </HostLanding>
  ),
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

async function exerciseRailContrast(canvasElement: HTMLElement, selector: string) {
  const rail = canvasElement.querySelector<HTMLElement>(selector)!;
  const pageScroll = {left: window.scrollX, top: window.scrollY};
  const railScroll = {left: rail.scrollLeft, top: rail.scrollTop};
  const buttons = within(rail).getAllByRole("button");
  const initial = buttons.find((button) => button.getAttribute("aria-current") === "step")!;
  for (const button of buttons) {
    for (const label of button.querySelectorAll<HTMLElement>("span, strong, small")) {
      await expect(contrastRatio(label)).toBeGreaterThanOrEqual(4.5);
    }
    await userEvent.click(button);
    await expect(button).toHaveAttribute("aria-current", "step");
    await expect(button).toHaveClass("is-active");
    await userEvent.hover(button);
    for (const label of button.querySelectorAll<HTMLElement>("span, strong, small")) {
      await expect(contrastRatio(label)).toBeGreaterThanOrEqual(4.5);
    }
    await userEvent.tab();
    button.focus();
    await expect(button).toHaveFocus();
    await expect(button.matches(":focus-visible")).toBe(true);
    const style = getComputedStyle(button);
    await expect(style.outlineStyle).toBe("solid");
    await expect(parseFloat(style.outlineWidth)).toBeGreaterThanOrEqual(2);
    await expect(contrastRatio(button, style.outlineColor)).toBeGreaterThanOrEqual(3);
    for (const label of button.querySelectorAll<HTMLElement>("span, strong, small")) {
      await expect(contrastRatio(label)).toBeGreaterThanOrEqual(4.5);
    }
  }
  await userEvent.click(initial);
  await expect(initial).toHaveAttribute("aria-current", "step");
  await userEvent.unhover(initial);
  initial.blur();
  rail.scrollTo({...railScroll, behavior: "instant"});
  window.scrollTo({...pageScroll, behavior: "instant"});
}
