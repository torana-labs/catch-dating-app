import {expect, fireEvent, within} from "storybook/test";
import type {Meta, StoryObj} from "@storybook/react-vite";
import {CatchRoot, CatchSurface} from "@catch/web-ui";
import {hostLandingCopy} from "@content/hostLanding";
import {hostFeeCalculatorCopy} from "@content/pricing";
import {PricingFeeCalculator} from "../features/marketing/PricingFeeCalculator";
import {PricingFeeBand} from "../features/marketing/PricingBands";

const meta = {
  title: "Marketing Website/Shared/Pricing fee calculator",
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

// catchComponent names the website registry's entry (design/website/components.json).
const storyRoutes = ["host", "pricing"];

/** Below the cap at the shared starting sales, then at the cap: 5% stops at the cap for the month. The calculator is drawn for the ink ground. */
export const FeeCalculator: Story = {
  name: "Pricing fee calculator",
  parameters: {catchComponent: {id: "pricing_fee_calculator", routeIds: storyRoutes, states: ["below-cap", "capped"]}},
  render: () => (
    <CatchRoot theme="day">
      <CatchSurface block="band" color="ink">
        <PricingFeeCalculator />
      </CatchSurface>
    </CatchRoot>
  ),
  play: async ({canvasElement}) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByText(hostFeeCalculatorCopy.capped)).toBeNull();
    fireEvent.change(canvas.getByRole("slider", {name: hostFeeCalculatorCopy.sales}), {target: {value: "500000"}});
    await expect(canvas.getByText(hostFeeCalculatorCopy.capped)).toBeInTheDocument();
  },
};

/** In the fee band's second column on ink, as /host/ shows it (PricingFeeBand, CatchFeeSection). */
export const InPricingSection: Story = {
  name: "Pricing fee calculator · in the fee band",
  parameters: {layout: "fullscreen", catchComponent: {id: "pricing_fee_band", routeIds: storyRoutes, states: ["host-band"]}},
  render: () => {
    const pricing = hostLandingCopy.pricing;
    return (
      <CatchRoot theme="day">
        <PricingFeeBand actions={[{label: pricing.start, href: "#start", variant: "light"}, {label: pricing.full, href: pricing.fullHref, variant: "ghost"}]}
          examples={pricing.examples} id="pricing" kicker={pricing.kicker} labels={pricing.included} rateTitle={pricing.title} />
      </CatchRoot>
    );
  },
};
