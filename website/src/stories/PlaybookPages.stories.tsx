import type {Meta, StoryObj} from "@storybook/react-vite";
import {applyBrand} from "@content/brand";
import runClubs from "@content/playbook/pages/host/run-clubs.json";
import {validatedPlaybookPage} from "@content/playbook/playbookContract";
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

/** A playbook page at one of its board's widths: the bands' container queries read the frame. */
function PlaybookAt({width}: {width: 390 | 1280}) {
  return (
    <div style={{margin: "0 auto", width}}>
      <PageShell pageClassName="home-page">
        <PlaybookPage captures={marketingCaptures} page={runClubsPage} />
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
