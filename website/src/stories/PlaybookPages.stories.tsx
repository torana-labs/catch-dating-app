import {expect, fireEvent, within} from "storybook/test";
import type {Meta, StoryObj} from "@storybook/react-vite";
import {applyBrand} from "@content/brand";
import runClubs from "@content/playbook/pages/host/run-clubs.json";
import pricing from "@content/playbook/pages/product/pricing.json";
import {validatedPlaybookPage, type PlaybookPageDocument} from "@content/playbook/playbookContract";
import {hostFeeCalculatorCopy} from "@content/pricing";
import {marketingCaptures} from "../app/marketingCaptures";
import {PlaybookPage} from "../features/playbook/PlaybookPage";
import {PageShell} from "../shared/site";

const meta = {
  title: "Marketing Website/Playbook pages",
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
const runClubsPage = applyBrand(validatedPlaybookPage(runClubs));
const pricingPage = applyBrand(validatedPlaybookPage(pricing));

/** A playbook page at one of its board's widths: the bands' container queries read the frame. */
function PlaybookAt({width, page = runClubsPage}: {width: 390 | 1280; page?: PlaybookPageDocument}) {
  return (
    <div style={{margin: "0 auto", width}}>
      <PageShell pageClassName="home-page">
        <PlaybookPage captures={marketingCaptures} page={page} />
      </PageShell>
    </div>
  );
}

export const RunClubs: Story = {
  name: "/host/run-clubs/ · 1280",
  parameters: {
    catchRoute: {
      id: "host_run_clubs",
      path: "/host/run-clubs/",
      reviewStates: ["page"],
      stateCoverage: {
        storybook: ["page"],
        manual: [],
      },
    },
    catchComponent: {
      id: "route_playbook_page",
      routeIds: ["host_run_clubs"],
      states: ["run-clubs"],
    },
  },
  render: () => <PlaybookAt width={1280} />,
};

/** The PlaybookRunClubs phone board: every band stacks. */
export const RunClubs390: Story = {
  name: "/host/run-clubs/ · 390",
  parameters: {
    catchComponent: {
      id: "route_playbook_page",
      routeIds: ["host_run_clubs"],
      states: ["run-clubs"],
    },
  },
  render: () => <PlaybookAt width={390} />,
};

/** The PlaybookPricing board: the fee band with the calculator, the worked examples, the cap, what is included, the trial, organisations and the FAQ. */
export const Pricing: Story = {
  name: "/pricing/ · 1280",
  parameters: {
    catchRoute: {id: "pricing", path: "/pricing/", reviewStates: ["page"], stateCoverage: {storybook: [], manual: ["page"]}},
    catchComponent: {id: "route_playbook_page", routeIds: ["pricing"], states: ["pricing"]},
  },
  render: () => <PlaybookAt page={pricingPage} width={1280} />,
};

/** The PlaybookPricing phone board: every band stacks. */
export const Pricing390: Story = {
  name: "/pricing/ · 390",
  parameters: {catchComponent: {id: "route_playbook_page", routeIds: ["pricing"], states: ["pricing"]}},
  render: () => <PlaybookAt page={pricingPage} width={390} />,
};

/** The calculator at the cap: the fee stops at the cap for the month. */
export const PricingCapped: Story = {
  name: "/pricing/ · calculator at the cap",
  parameters: {catchComponent: {id: "route_playbook_page", routeIds: ["pricing"], states: ["pricing"]}},
  render: () => <PlaybookAt page={pricingPage} width={1280} />,
  play: async ({canvasElement}) => {
    const canvas = within(canvasElement);
    fireEvent.change(canvas.getByRole("slider", {name: hostFeeCalculatorCopy.sales}), {target: {value: "500000"}});
    await expect(canvas.getByText(hostFeeCalculatorCopy.capped)).toBeInTheDocument();
  },
};
