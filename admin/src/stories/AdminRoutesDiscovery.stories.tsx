import type {Meta, StoryObj} from "@storybook/react-vite";
import type {DiscoverySettingsController} from "../features/discovery/controllers/useDiscoverySettingsController";
import {DiscoverySettingsWorkspace} from "../features/discovery/ui/DiscoverySettingsWorkspace";

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

const onCatchOnly = {onCatch: true, notOnCatch: false};

const storyDiscoverySettings: DiscoverySettingsController = {
  snapshot: {
    settings: {
      surfaces: {
        homeOrganizers: onCatchOnly,
        cityOrganizers: {onCatch: true, notOnCatch: true},
        plans: {onCatch: true, notOnCatch: true},
        totals: onCatchOnly,
      },
      homeOrganizersMinimum: 3,
      homeClaimAction: true,
      updatedAtMillis: Date.parse("2026-11-18T06:30:00.000Z"),
      updatedByUid: "sample-owner",
    },
    defaults: {
      surfaces: {homeOrganizers: onCatchOnly, cityOrganizers: onCatchOnly, plans: onCatchOnly, totals: onCatchOnly},
      homeOrganizersMinimum: 1,
      homeClaimAction: false,
    },
  },
  loadState: "ready", isSaving: false, canEdit: true, save: async () => true,
};

export const DiscoverySettingsWorkspaceStory: Story = {
  name: "Settings · Discovery",
  parameters: {
    catchComponent: {id: "workspace_discovery_settings", states: ["owner-edits", "ops-reads"]},
  },
  render: () => <DiscoverySettingsWorkspace currentUserUid="sample-owner" settings={storyDiscoverySettings} />,
};
