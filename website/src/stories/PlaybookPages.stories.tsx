import {expect, fireEvent, within} from "storybook/test";
import type {Meta, StoryObj} from "@storybook/react-vite";
import {applyBrand} from "@content/brand";
import runClubs from "@content/playbook/pages/host/run-clubs.json";
import firstEvent from "@content/playbook/pages/host/first-event.json";
import programmes from "@content/playbook/pages/host/programmes.json";
import start from "@content/playbook/pages/host/start.json";
import switchPage from "@content/playbook/pages/host/switch.json";
import pricing from "@content/playbook/pages/product/pricing.json";
import about from "@content/playbook/pages/resources/about.json";
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
const aboutPage = applyBrand(validatedPlaybookPage(about));
const startPage = applyBrand(validatedPlaybookPage(start));
const firstEventPage = applyBrand(validatedPlaybookPage(firstEvent));
const switchPlaybookPage = applyBrand(validatedPlaybookPage(switchPage));
const programmesPage = applyBrand(validatedPlaybookPage(programmes));

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

/** The PlaybookAbout board: the hero, why we built it, what we believe, the market’s cities, questions and the closing band. */
export const About: Story = {
  name: "/about/ · 1280",
  parameters: {
    catchRoute: {id: "about", path: "/about/", reviewStates: ["page"], stateCoverage: {storybook: [], manual: ["page"]}},
    catchComponent: {id: "route_playbook_page", routeIds: ["about"], states: ["about"]},
  },
  render: () => <PlaybookAt page={aboutPage} width={1280} />,
};

/** The phone board: every band stacks. */
export const About390: Story = {
  name: "/about/ · 390",
  parameters: {catchComponent: {id: "route_playbook_page", routeIds: ["about"], states: ["about"]}},
  render: () => <PlaybookAt page={aboutPage} width={390} />,
};

/** The PlaybookStart board’s start state: menu-free, a QR code of the page and the host app’s store badges. */
export const HostStart: Story = {
  name: "/host/start/ · 1280",
  parameters: {
    catchRoute: {id: "host_start", path: "/host/start/", reviewStates: ["page"], stateCoverage: {storybook: [], manual: ["page"]}},
    catchComponent: {id: "route_playbook_page", routeIds: ["host_start"], states: ["host-start"]},
  },
  render: () => <PlaybookAt page={startPage} width={1280} />,
};

/** The phone board: every band stacks. */
export const HostStart390: Story = {
  name: "/host/start/ · 390",
  parameters: {catchComponent: {id: "route_playbook_page", routeIds: ["host_start"], states: ["host-start"]}},
  render: () => <PlaybookAt page={startPage} width={390} />,
};

/** The PlaybookFirstEvent board: seven steps, the countdown, help on WhatsApp, formats, mistakes and questions. */
export const FirstEvent: Story = {
  name: "/host/first-event/ · 1280",
  parameters: {
    catchRoute: {id: "host_first_event", path: "/host/first-event/", reviewStates: ["page"], stateCoverage: {storybook: [], manual: ["page"]}},
    catchComponent: {id: "route_playbook_page", routeIds: ["host_first_event"], states: ["first-event"]},
  },
  render: () => <PlaybookAt page={firstEventPage} width={1280} />,
};

/** The phone board: every band stacks. */
export const FirstEvent390: Story = {
  name: "/host/first-event/ · 390",
  parameters: {catchComponent: {id: "route_playbook_page", routeIds: ["host_first_event"], states: ["first-event"]}},
  render: () => <PlaybookAt page={firstEventPage} width={390} />,
};

/** The PlaybookSwitch board: what you are moving from as tabs, two ways to move, what comes with you and the first month. */
export const Switch: Story = {
  name: "/host/switch/ · 1280",
  parameters: {
    catchRoute: {id: "host_switch", path: "/host/switch/", reviewStates: ["page"], stateCoverage: {storybook: [], manual: ["page"]}},
    catchComponent: {id: "route_playbook_page", routeIds: ["host_switch"], states: ["switch"]},
  },
  render: () => <PlaybookAt page={switchPlaybookPage} width={1280} />,
};

/** The phone board: every band stacks. */
export const Switch390: Story = {
  name: "/host/switch/ · 390",
  parameters: {catchComponent: {id: "route_playbook_page", routeIds: ["host_switch"], states: ["switch"]}},
  render: () => <PlaybookAt page={switchPlaybookPage} width={390} />,
};

/** The PlaybookProgrammes board, priced per programme after a walkthrough. */
export const Programmes: Story = {
  name: "/programmes/ · 1280",
  parameters: {
    catchRoute: {id: "programmes", path: "/programmes/", reviewStates: ["page"], stateCoverage: {storybook: [], manual: ["page"]}},
    catchComponent: {id: "route_playbook_page", routeIds: ["programmes"], states: ["programmes"]},
  },
  render: () => <PlaybookAt page={programmesPage} width={1280} />,
};

/** The phone board: every band stacks. */
export const Programmes390: Story = {
  name: "/programmes/ · 390",
  parameters: {catchComponent: {id: "route_playbook_page", routeIds: ["programmes"], states: ["programmes"]}},
  render: () => <PlaybookAt page={programmesPage} width={390} />,
};
