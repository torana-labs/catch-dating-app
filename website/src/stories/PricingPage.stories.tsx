import {expect, fireEvent, within} from "storybook/test";
import type {Meta, StoryObj} from "@storybook/react-vite";
import {applyBrand} from "@content/brand";
import pricing from "@content/playbook/pages/product/pricing.json";
import {validatedPlaybookPage} from "@content/playbook/playbookContract";
import {hostFeeCalculatorCopy} from "@content/pricing";
import {marketingCaptures} from "../app/marketingCaptures";
import {PlaybookPage} from "../features/playbook/PlaybookPage";
import {PageShell} from "../shared/site";

const meta = {
  title: "Marketing Website/Pricing",
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

// The page as the renderer gets it: validated, with its brand tokens resolved.
const pricingPage = applyBrand(validatedPlaybookPage(pricing));

/** /pricing/ at one of its board's widths: the bands' container queries read the frame. */
function PricingAt({width}: {width: 390 | 1280}) {
  return (
    <div style={{margin: "0 auto", width}}>
      <PageShell pageClassName="home-page">
        <PlaybookPage captures={marketingCaptures} page={pricingPage} />
      </PageShell>
    </div>
  );
}

const route = {
  id: "pricing",
  path: "/pricing/",
  reviewStates: ["page"],
  stateCoverage: {storybook: ["page"], manual: []},
};
const component = {id: "route_playbook_page", routeIds: ["pricing"], states: ["pricing"]};

/** The PlaybookPricing board: the fee band with the calculator, the worked examples, the cap, what is included, the trial, organisations and the FAQ. */
export const Pricing: Story = {
  name: "/pricing/ · 1280",
  parameters: {catchRoute: route, catchComponent: component},
  render: () => <PricingAt width={1280} />,
};

/** The PlaybookPricing phone board: every band stacks. */
export const Pricing390: Story = {
  name: "/pricing/ · 390",
  parameters: {catchComponent: component},
  render: () => <PricingAt width={390} />,
};

/** The calculator at the cap: the fee stops at the cap for the billing cycle. */
export const PricingCapped: Story = {
  name: "/pricing/ · calculator at the cap",
  parameters: {catchComponent: component},
  render: () => <PricingAt width={1280} />,
  play: async ({canvasElement}) => {
    const canvas = within(canvasElement);
    fireEvent.change(canvas.getByRole("slider", {name: hostFeeCalculatorCopy.sales}), {target: {value: "500000"}});
    await expect(canvas.getByText(hostFeeCalculatorCopy.capped)).toBeInTheDocument();
  },
};
