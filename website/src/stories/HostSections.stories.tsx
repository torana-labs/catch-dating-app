import {expect, fireEvent, userEvent, within} from "storybook/test";
import type {Meta, StoryObj} from "@storybook/react-vite";
import type {ReactNode} from "react";
import {hostLandingCopy as copy} from "@content/hostLanding";
import {hostFeeCalculatorCopy} from "@content/pricing";
import {marketingCaptures} from "../app/marketingCaptures";
import {HostPage} from "../features/host/HostPage";

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

/** The host landing at the board's widths. */
function Width({children, width}: {children: ReactNode; width: 390 | 1280}) {
  return <div style={{margin: "0 auto", width}}>{children}</div>;
}

/** The whole landing at 1280, as the PlaybookHosts board. */
export const HostLanding1280: Story = {
  name: "Host landing · 1280",
  parameters: {layout: "fullscreen"},
  render: () => <Width width={1280}><HostPage captures={marketingCaptures} /></Width>,
};

/** The whole landing on a phone: the rows stack and the header's links move into its menu. */
export const HostLanding390: Story = {
  name: "Host landing · 390 (phone)",
  parameters: {layout: "fullscreen"},
  render: () => <Width width={390}><HostPage captures={marketingCaptures} /></Width>,
};

/** Another format picked in the night scene: it follows the pickleball social. */
export const NightFormat: Story = {
  name: "Host landing · night format",
  parameters: {layout: "fullscreen"},
  render: () => <Width width={1280}><HostPage captures={marketingCaptures} /></Width>,
  play: async ({canvasElement}) => {
    const canvas = within(canvasElement);
    await userEvent.click(within(canvas.getByRole("radiogroup", {name: copy.night.pickerLabel})).getByRole("radio", {name: "Pickleball"}));
    await expect(canvas.getByRole("button", {name: /Levels in, courts planned/})).toHaveAttribute("aria-current", "step");
  },
};

/** Pricing at the cap: the shared fee calculator stops the fee at the cap for the month. */
export const PricingCap: Story = {
  name: "Host landing · pricing cap",
  parameters: {layout: "fullscreen"},
  render: () => <Width width={1280}><HostPage captures={marketingCaptures} /></Width>,
  play: async ({canvasElement}) => {
    const canvas = within(canvasElement);
    fireEvent.change(canvas.getByRole("slider", {name: hostFeeCalculatorCopy.sales}), {target: {value: "500000"}});
    await expect(canvas.getByText(hostFeeCalculatorCopy.capped)).toBeInTheDocument();
  },
};

/** The closing band: three steps, Catch Host's badges, a person and the link to Catch for weddings. */
export const StartBand: Story = {
  name: "Host landing · start band",
  parameters: {layout: "fullscreen"},
  render: () => <Width width={1280}><HostPage captures={marketingCaptures} /></Width>,
  play: async ({canvasElement}) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("link", {name: copy.start.weddings})).toHaveAttribute("href", "/weddings/");
  },
};
