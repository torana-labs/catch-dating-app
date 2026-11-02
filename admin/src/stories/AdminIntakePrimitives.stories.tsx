import {
  CatchAdminIntakeDecisionActions,
  CatchAdminIntakeDecisionState,
  CatchAdminIntakeSectionTitle,
  CatchAdminIntakeSourceList,
  CatchAdminSearchCandidateHeader,
  CatchBadge,
  CatchField,
} from "@catch/web-ui";
import type {Meta, StoryObj} from "@storybook/react-vite";
import {
  CheckCircle2,
  FileWarning,
  Link2,
  Lock,
  Search,
} from "lucide-react";
import {
  AdminButton,
  AdminCard,
  AdminPanel,
  AdminWorkspace,
  AlertRow,
  QualityList,
  QualityRow,
} from "../shared/ui/AdminPrimitives";

const meta = {
  title: "Admin Dashboard/Intake Primitives",
  parameters: {
    catchComponentRegistry: {
      path: "design/admin/components.json",
    },
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const AdminIntakeSectionTitleStory: Story = {
  name: "Section title",
  parameters: {
    catchComponent: {
      id: "shared_admin_intake_section_title",
      states: ["title-meta"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <CatchAdminIntakeSectionTitle>
        <strong>Policy gates</strong>
        <span>4 warnings</span>
      </CatchAdminIntakeSectionTitle>
    </AdminWorkspace>
  ),
};

export const AdminIntakeSourceListStory: Story = {
  name: "Source list",
  parameters: {
    catchComponent: {
      id: "shared_admin_intake_source_list",
      states: ["sources"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <CatchAdminIntakeSourceList>
        <QualityRow icon={<Link2 size={16} />} tone="success">
          <strong>Instagram</strong>
          <span>Recent public event evidence.</span>
        </QualityRow>
        <QualityRow icon={<Link2 size={16} />} tone="warning">
          <strong>Website</strong>
          <span>Needs canonical URL confirmation.</span>
        </QualityRow>
      </CatchAdminIntakeSourceList>
    </AdminWorkspace>
  ),
};

export const AdminIntakeDecisionStateStory: Story = {
  name: "Decision state",
  parameters: {
    catchComponent: {
      id: "shared_admin_intake_decision_state",
      states: ["saved"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <CatchAdminIntakeDecisionState>
        <CheckCircle2 size={16} />
        <div>
          <strong>approved for public listing</strong>
          <span>reviewDecisions/afterfly</span>
        </div>
      </CatchAdminIntakeDecisionState>
    </AdminWorkspace>
  ),
};

export const AdminIntakeDecisionActionsStory: Story = {
  name: "Decision actions",
  parameters: {
    catchComponent: {
      id: "shared_admin_intake_decision_actions",
      states: ["actions"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <CatchAdminIntakeDecisionActions>
        <AdminButton>Suppress</AdminButton>
        <AdminButton>Hold</AdminButton>
        <AdminButton variant="primary">Approve</AdminButton>
      </CatchAdminIntakeDecisionActions>
    </AdminWorkspace>
  ),
};

export const AdminSearchCandidateHeaderStory: Story = {
  name: "Search candidate header",
  parameters: {
    catchComponent: {
      id: "shared_admin_search_candidate_header",
      states: ["title-status"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminCard variant="searchCandidate">
        <CatchAdminSearchCandidateHeader>
          <strong>Afterfly Social</strong>
          <CatchBadge recipe="status" tone="success" label="96% match" />
        </CatchAdminSearchCandidateHeader>
      </AdminCard>
    </AdminWorkspace>
  ),
};
