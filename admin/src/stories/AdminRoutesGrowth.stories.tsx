import {sampleGrowth, sampleNominatorCredits} from "../features/growth/api/growthSamples";
import type {GrowthController} from "../features/growth/controllers/useGrowthController";
import {GrowthScreen} from "../features/growth/ui/GrowthScreen";
import type {Meta, StoryObj} from "@storybook/react-vite";
import {noop} from "./adminRouteStoryKit";

const meta = {
  title: "Admin Dashboard/Routes",
  parameters: {
    catchComponentRegistry: {
      path: "design/admin/components.json",
    },
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const growthSample = sampleGrowth({range: "12m"});
const growthCredits = sampleNominatorCredits({action: "list", nominatorUid: null, note: null});
const growthStoryController: GrowthController = {
  view: "nominators",
  range: "12m",
  data: growthSample,
  credits: growthCredits,
  loadState: "ready",
  loadError: null,
  nominatorFilter: "all",
  bestFilter: "all",
  search: "",
  nominators: growthSample.nominators,
  best: growthSample.best,
  selectedNominator: growthSample.nominators[0] ?? null,
  selectedCredit: growthCredits.nominators.find((row) => row.nominatorUid === growthSample.nominators[0]?.uid) ?? null,
  isActing: false,
  actionError: null,
  setView: noop,
  setRange: noop,
  setNominatorFilter: noop,
  setBestFilter: noop,
  setSearch: noop,
  selectNominator: noop,
  approveCredit: () => Promise.resolve(true),
  markCreditPaid: () => Promise.resolve(true),
};

export const GrowthRouteStory: Story = {
  name: "Growth",
  parameters: {
    catchComponent: {
      id: "route_growth",
      states: ["cohorts", "channels-and-ads", "nominators", "best-organizers"],
    },
  },
  render: () => (
    <GrowthScreen
      controller={growthStoryController}
      detailOpen
      onCloseDetail={noop}
      onSelectNominator={noop}
      onViewChange={noop}
    />
  ),
};
