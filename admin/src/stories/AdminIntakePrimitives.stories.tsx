import {CatchAdminIntakeDecisionActions, CatchAdminIntakeDecisionState, CatchAdminIntakeSection, CatchAdminIntakeSourceList, CatchAdminSearchCandidateHeader, CatchBadge, CatchField} from "@catch/web-ui";
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
  AdminGuardrailList,
  AdminIntakeBoundaryNotice,
  AdminIntakePublicationBoundaryPanel,
  AdminIntakeReviewWorkbench,
  AdminIntakeStageRail,
  AdminIntakeTaskToolbar,
  AdminIntakeWorkspaceFrame,
  AdminIntakeWorkspaceTabs,
  AdminOrganizerIntakeCheckboxField,
  AdminPanel,
  AdminTagList,
  AdminWorkspace,
  AlertRow,
  QualityList,
  QualityRow,
  SearchField,
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

export const AdminIntakeWorkspaceTabsStory: Story = {
  name: "Workspace tabs",
  parameters: {
    catchComponent: {
      id: "shared_admin_intake_workspace_tabs",
      states: ["events-selected", "organizers-selected", "disabled"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminIntakeWorkspaceTabs
        ariaLabel="Intake workspace"
        options={[
          {id: "events", label: "Events"},
          {id: "organizers", label: "Organizers"},
          {disabled: true, id: "archived", label: "Archived"},
        ]}
        value="organizers"
        onChange={() => undefined}
      />
    </AdminWorkspace>
  ),
};

export const AdminIntakeWorkspaceFrameStory: Story = {
  name: "Workspace frame",
  parameters: {
    catchComponent: {
      id: "shared_admin_intake_workspace_frame",
      states: ["compact-chrome", "full-height-content"],
    },
  },
  render: () => (
    <AdminWorkspace intakeMode>
      <AdminIntakeWorkspaceFrame
        chrome={(
          <AdminIntakeWorkspaceTabs
            ariaLabel="Intake workspace"
            options={[
              {id: "events", label: "Events"},
              {id: "organizers", label: "Organizers"},
            ]}
            value="organizers"
            onChange={() => undefined}
          />
        )}
      >
        <AdminPanel
          icon={<FileWarning aria-hidden="true" size={16} />}
          title="Full-height queue"
        >
          The queue owns this region.
        </AdminPanel>
      </AdminIntakeWorkspaceFrame>
    </AdminWorkspace>
  ),
};

export const AdminIntakeTaskToolbarStory: Story = {
  name: "Task toolbar",
  parameters: {
    catchComponent: {
      id: "shared_admin_intake_task_toolbar",
      states: ["search-and-filters", "desktop", "mobile"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminIntakeTaskToolbar aria-label="Intake filters">
        <SearchField ariaLabel="Search intake" placeholder="Search organizer, source, city..." />
        <AdminButton>All cities</AdminButton>
        <AdminButton>All priorities</AdminButton>
        <AdminButton>Diagnostics</AdminButton>
        <AdminButton variant="primary">Refresh</AdminButton>
      </AdminIntakeTaskToolbar>
    </AdminWorkspace>
  ),
};

export const AdminIntakeStageRailStory: Story = {
  name: "Stage rail",
  parameters: {
    catchComponent: {
      id: "shared_admin_intake_stage_rail",
      states: ["incoming", "verify", "resolve", "ready"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminIntakeStageRail
        ariaLabel="Organizer intake stages"
        options={[
          {id: "incoming", label: "Incoming"},
          {id: "verify", label: "Verify"},
          {id: "resolve", label: "Resolve"},
          {id: "ready", label: "Ready"},
        ]}
        value="verify"
        onChange={() => undefined}
      />
    </AdminWorkspace>
  ),
};

export const AdminIntakeBoundaryNoticeStory: Story = {
  name: "Boundary notice",
  parameters: {
    catchComponent: {
      id: "shared_admin_intake_boundary_notice",
      states: ["compact", "expanded-action"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminIntakeBoundaryNotice
        actionLabel="View boundary"
        title="Approval creates a publishing handoff—not ownership or app visibility."
        onAction={() => undefined}
      >
        Claims, crawling, and canonical edits stay separately gated.
      </AdminIntakeBoundaryNotice>
    </AdminWorkspace>
  ),
};

export const AdminIntakeReviewWorkbenchStory: Story = {
  name: "Review workbench",
  parameters: {
    catchComponent: {
      id: "shared_admin_intake_review_workbench",
      states: [
        "populated",
        "batch-selection",
        "partial-eligibility",
        "inspector-open",
        "keyboard-help",
        "loading",
        "error",
        "unavailable",
        "filter-empty",
        "stage-empty",
        "blocked-decision",
        "mobile",
      ],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminIntakeReviewWorkbench
        detail={{
          actionGate: "Approval is disabled until the evidence blocker is resolved.",
          actions: <AdminButton disabled variant="primary">Approve listing</AdminButton>,
          blockers: [{
            action: "Acknowledge the unbound manual reports.",
            id: "reports",
            label: "Manual reports need review",
            tone: "warning",
          }],
          initials: "AF",
          readiness: {blockers: 1, complete: 4, label: "Decision readiness", total: 6},
          sections: [
            {
              id: "evidence",
              kind: "evidence",
              rows: [{
                id: "instagram",
                meta: "Primary identity surface",
                status: "Confirmed",
                statusTone: "success",
                title: "Instagram · @afterfly.in",
              }],
              title: "Source evidence",
            },
            {
              id: "impact",
              kind: "impact",
              rows: [
                {id: "website", label: "Website listing", tone: "success", value: "Ready after review"},
                {id: "app", label: "App visibility", value: "Stays hidden"},
              ],
              title: "Handoff impact",
            },
            {
              content: <CatchField
                recipe="input"
                title="Decision note"
                maxLines={2}
                value=""
                onChanged={() => undefined}
              />,
              id: "note",
              kind: "content",
              title: "Decision note",
            },
          ],
          status: "Needs evidence",
          statusTone: "warning",
          subtitle: "Organizer lead · afterfly · Indore",
          title: "AFTER FLY",
        }}
        filters={[
          {id: "all", label: "All 2", selected: true},
          {id: "blocked", label: "Blocked 1", selected: false},
        ]}
        items={[
          {
            description: "Run club · Indore",
            id: "afterfly",
            initials: "AF",
            meta: "5 surfaces · 2 reports",
            status: "Needs evidence",
            statusTone: "warning",
            title: "AFTER FLY",
          },
          {
            description: "Run club · Delhi NCR",
            id: "bhag",
            initials: "BC",
            meta: "3 surfaces · 0 reports",
            status: "Ready",
            statusTone: "success",
            title: "Bhag Club",
          },
        ]}
        queueMeta="2 items"
        queueTitle="Needs verification"
        selectedId="afterfly"
        onFilterChange={() => undefined}
        onSelect={() => undefined}
      />
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

export const AdminGuardrailListStory: Story = {
  name: "Guardrail list",
  parameters: {
    catchComponent: {
      id: "shared_admin_guardrail_list",
      states: ["alerts"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminGuardrailList>
        <AlertRow icon={<Lock size={16} />} title="Write boundary">
          Review decisions do not publish canonical records.
        </AlertRow>
        <AlertRow icon={<FileWarning size={16} />} tone="warning" title="Needs source">
          Owner claim handoff requires source evidence.
        </AlertRow>
      </AdminGuardrailList>
    </AdminWorkspace>
  ),
};

export const AdminIntakePublicationBoundaryPanelStory: Story = {
  name: "Publication boundary panel",
  parameters: {
    catchComponent: {
      id: "shared_admin_intake_publication_boundary_panel",
      states: ["events", "organizers"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminIntakePublicationBoundaryPanel activeWorkspace="events" />
      <AdminIntakePublicationBoundaryPanel activeWorkspace="organizers" />
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

export const AdminOrganizerIntakeCheckboxFieldStory: Story = {
  name: "Organizer checkbox field",
  parameters: {
    catchComponent: {
      id: "shared_admin_organizer_intake_checkbox_field",
      states: ["checked", "unchecked"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminOrganizerIntakeCheckboxField checked label="Source reviewed" onChange={() => undefined} />
      <AdminOrganizerIntakeCheckboxField checked={false} label="Needs owner proof" onChange={() => undefined} />
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

export const AdminIntakeSectionStory: Story = {
  name: "Intake section",
  parameters: {
    catchComponent: {
      id: "shared_admin_intake_section",
      states: ["summary", "event-editor", "duplicate-comparison"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <CatchAdminIntakeSection>
        <p>Afterfly · 3 events found · 1 of 1 pages read</p>
      </CatchAdminIntakeSection>
      <CatchAdminIntakeSection variant="event-editor">
        <label>Title<small>Takeoff: Run + Rave</small></label>
        <label>Starts<small>15 Nov, 6 PM</small></label>
      </CatchAdminIntakeSection>
      <CatchAdminIntakeSection variant="duplicate-comparison">
        <article><strong>Imported</strong><span>Takeoff: Run + Rave · 15 Nov</span></article>
        <article><strong>Published</strong><span>Takeoff Run · 15 Nov</span></article>
      </CatchAdminIntakeSection>
    </AdminWorkspace>
  ),
};
