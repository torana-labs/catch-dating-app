import type {Meta, StoryObj} from "@storybook/react-vite";
import {CatchPaneLayout} from "@catch/web-ui";
import {IntakeSettingsWorkspace} from "../features/intake/organizer/ui/IntakeSettingsWorkspace";

const meta = {
  title: "Admin Dashboard/Settings · Intake",
  parameters: {catchComponentRegistry: {path: "design/admin/components.json"}},
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const done = async () => true;

export const IntakeSettingsStory: Story = {
  name: "Intake settings",
  parameters: {catchComponent: {id: "route_settings_intake", states: ["policies", "limits", "nominators", "launch-cities"]}},
  render: () => (
    <CatchPaneLayout pattern="reading" main={
      <IntakeSettingsWorkspace
        nominators={{isLoading: false, loadFailed: false, isSaving: false, myUid: "sample-owner", save: done, nominators: [
          {nominatorId: "whatsapp-a", channel: "whatsapp", phoneLast4: "0000", instagramHandle: null, role: "associate", uid: "riya",
            displayName: "Riya Sharma", defaultMarket: "mumbai", active: true, updatedAt: "2026-10-30T08:00:00.000Z"},
          {nominatorId: "instagram-b", channel: "instagram", phoneLast4: null, instagramHandle: "karan.m", role: "partner", uid: "karan",
            displayName: "Karan Mehta", defaultMarket: null, active: false, updatedAt: "2026-10-30T08:00:00.000Z"},
        ]}}
        policies={{isLoading: false, loadFailed: false, isDeciding: false, decide: done, policies: [
          {gapId: "on_demand_page_fetch_policy", label: "Read the pages a nomination names", enables: "Catch fetches the public pages a nomination gives.",
            configPath: "operations/src/workflows/supply-intake/config/acquisition_policy.json (pageFetch)", decisionId: "policy-on-demand-page-fetch-policy",
            decision: null, enabled: false, configCitesDecision: false,
            limits: [{label: "Pages per nomination", value: 5}, {label: "Pages per month", value: 2000}]},
        ]}}
      />
    } />
  ),
};
