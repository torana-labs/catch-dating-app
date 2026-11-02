import type {TeamController} from "../features/settings/controllers/useTeamController";
import {SettingsScreen} from "../features/settings/ui/SettingsScreen";
import {TeamSettingsWorkspace} from "../features/settings/ui/TeamSettingsWorkspace";
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

const storyTeamMembers = [
  {targetUid: "owner-1", email: "suvrat@catch.local", displayName: "Suvrat Garg", disabled: false,
    roles: ["adminOwner" as const], assignmentPath: "adminRoleAssignments/owner-1", status: "active" as const,
    updatedAt: null, updatedByUid: null},
  {targetUid: "ops-1", email: "dev@catch.local", displayName: "Dev Iyer", disabled: false,
    roles: ["support" as const], assignmentPath: "adminRoleAssignments/ops-1", status: "active" as const,
    updatedAt: null, updatedByUid: null},
];

const storyTeam: TeamController = {
  members: storyTeamMembers, selected: storyTeamMembers[1], selectedUid: "ops-1", job: "sales",
  note: "Moving to sales from Monday.", loadState: "ready", isSaving: false, validationIssue: null,
  setJob: () => undefined, setNote: () => undefined, save: async () => true,
};

export const SettingsRouteStory: Story = {
  name: "Settings · Team and roles",
  parameters: {
    catchComponent: {id: "route_settings", states: ["team", "role-change"]},
  },
  render: () => (
    <SettingsScreen
      onSelectPage={noop}
      pages={[{id: "safety", title: "Safety", subtitle: "Account actions, deadlines, grievance contact"},
        {id: "team", title: "Team and roles", subtitle: "Who has an Admin job"}]}
      selectedPage="team"
    >
      <TeamSettingsWorkspace onClosePerson={noop} onOpenPerson={noop} team={storyTeam} />
    </SettingsScreen>
  ),
};

export const TeamSettingsWorkspaceStory: Story = {
  name: "Team and roles",
  parameters: {
    catchComponent: {id: "workspace_team_settings", states: ["team", "role-change"]},
  },
  render: () => <TeamSettingsWorkspace onClosePerson={noop} onOpenPerson={noop} team={storyTeam} />,
};
