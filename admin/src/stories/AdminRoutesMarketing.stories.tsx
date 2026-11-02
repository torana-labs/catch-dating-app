import {sampleMarketingOpsBridge} from "../shared/api/sampleOperationalData";
import type {MarketingOpsController} from "../features/marketing/controllers/useMarketingOpsController";
import {AdminWorkspace} from "../shared/ui/AdminPrimitives";
import {MarketingOpsWorkspace} from "../features/marketing/ui/MarketingOpsScreen";
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

const marketingOpsBridge =
  structuredClone(sampleMarketingOpsBridge) as MarketingOpsController["bridge"];

const marketingOpsSelectedDraft =
  marketingOpsBridge?.contentDrafts[0] ?? null;

const marketingOpsController: MarketingOpsController = {
  activeTab: "posts",
  bridge: marketingOpsBridge,
  bridgeError: null,
  bridgeGeneratedAt: marketingOpsBridge?.generatedAt ?? null,
  bridgeIsStale: false,
  composerStep: 0,
  createDraft: async (_draftType) => {
    noop();
  },
  discardSelectedDraftEdits: () => {
    noop();
  },
  hasUnsavedChanges: false,
  inFlight: {},
  isLoading: false,
  loadBridge: async () => {
    noop();
    return true;
  },
  localDecisions: {},
  notes: {},
  reviewReceiptRecorded: false,
  rightsConfirmed: false,
  savedBridge: marketingOpsBridge,
  selectedDraft: marketingOpsSelectedDraft,
  selectedDraftDirty: false,
  selectedDraftId: marketingOpsSelectedDraft?.id ?? null,
  selectedDraftUnavailable: false,
  selectedEditSize: marketingOpsSelectedDraft ?
    JSON.stringify(marketingOpsSelectedDraft).length : 0,
  selectedEditTooLarge: false,
  setActiveTab: (_value) => {
    noop();
  },
  setComposerStep: (_value) => {
    noop();
  },
  setNote: (_key: string, _value: string) => {
    noop();
  },
  setRightsConfirmed: (_value: boolean) => {
    noop();
  },
  setTypeFilter: (_value) => {
    noop();
  },
  targetDecision: async (_input) => {
    noop();
  },
  typeFilter: "all",
  updateDraft: (_draftId, _patch) => {
    noop();
  },
  updateDraftSlide: (_draftId, _slideId, _patch) => {
    noop();
  },
  updateRecommendationItem: (_setId, _itemId, _patch) => {
    noop();
  },
  openDraft: (_draftId: string) => {
    noop();
  },
};

const renderMarketingOpsWorkspace = () => (
  <AdminWorkspace>
    <MarketingOpsWorkspace controller={marketingOpsController} />
  </AdminWorkspace>
);

export const MarketingOpsRouteStory: Story = {
  name: "Marketing",
  parameters: {
    catchComponent: {
      id: "route_marketing_ops",
      states: ["post-board"],
    },
  },
  render: renderMarketingOpsWorkspace,
};

export const MarketingOpsWorkspaceStory: Story = {
  name: "Marketing workspace",
  parameters: {
    catchComponent: {
      id: "workspace_marketing_ops",
      states: ["post-board"],
    },
  },
  render: renderMarketingOpsWorkspace,
};
