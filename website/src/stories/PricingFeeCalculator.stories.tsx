import {expect, fireEvent, within} from "storybook/test";
import type {Meta, StoryObj} from "@storybook/react-vite";
import {CatchPricingSection, CatchRoot} from "@catch/web-ui";
import {hostLandingCopy} from "@content/hostLanding";
import {hostFeeCalculatorCopy} from "@content/pricing";
import {PricingFeeCalculator} from "../features/marketing/PricingFeeCalculator";

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

const catchComponent = {
  id: "pricing_fee_calculator",
  routeIds: ["host", "pricing"],
  states: ["below-cap", "capped", "pricing-section-slot"],
};

/** Below the cap at the shared starting sales, then at the cap: 5% stops at the cap for the billing cycle. */
export const FeeCalculator: Story = {
  name: "Pricing fee calculator",
  parameters: {catchComponent},
  render: () => (
    <CatchRoot theme="day">
      <PricingFeeCalculator />
    </CatchRoot>
  ),
  play: async ({canvasElement}) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(hostFeeCalculatorCopy.uncapped)).toBeInTheDocument();
    fireEvent.change(canvas.getByRole("slider", {name: hostFeeCalculatorCopy.sales}), {target: {value: "500000"}});
    await expect(canvas.getByText(hostFeeCalculatorCopy.capped)).toBeInTheDocument();
  },
};

/** In CatchPricingSection's calculator slot on the ink band, as /host/ and /pricing/ show it. */
export const InPricingSection: Story = {
  name: "Pricing fee calculator · in the pricing band",
  parameters: {layout: "fullscreen", catchComponent},
  render: () => {
    const pricing = hostLandingCopy.pricing;
    return (
      <CatchRoot theme="day">
        <CatchPricingSection calculator={<PricingFeeCalculator />} cap={pricing.body} examples={pricing.examples} ground="ink"
          kicker={pricing.kicker} rate={pricing.rate} title={pricing.title} trial={pricing.terms} />
      </CatchRoot>
    );
  },
};
