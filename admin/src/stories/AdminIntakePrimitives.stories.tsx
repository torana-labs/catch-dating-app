import {CatchField} from "@catch/web-ui";
import type {Meta, StoryObj} from "@storybook/react-vite";
import {
  CheckCircle2,
  FileWarning,
  Link2,
  Lock,
  MapPin,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import {
  AdminButton,
  AdminCard,
  AdminGuardrailList,
  AdminIntakeDecisionActions,
  AdminIntakeDecisionBox,
  AdminIntakeDecisionState,
  AdminIntakeBoundaryNotice,
  AdminIntakeGate,
  AdminIntakeGateList,
  AdminIntakeLayout,
  AdminIntakePublicationBoundaryPanel,
  AdminIntakeReviewWorkbench,
  AdminIntakeSection,
  AdminIntakeSectionTitle,
  AdminIntakeSourceList,
  AdminIntakeStateGrid,
  AdminIntakeStageRail,
  AdminIntakeTaskToolbar,
  AdminIntakeWorkspaceFrame,
  AdminIntakeWorkspaceTabs,
  AdminOrganizerCurationControlGrid,
  AdminOrganizerCurationControlSection,
  AdminOrganizerIntakeBadges,
  AdminOrganizerIntakeCard,
  AdminOrganizerIntakeCardHeader,
  AdminOrganizerIntakeCheckboxField,
  AdminOrganizerIntakeCurationPanel,
  AdminOrganizerIntakeList,
  AdminOrganizerIntakeSurfaceGrid,
  AdminOrganizerLocationResolutionForm,
  AdminOrganizerPolicyGapColumns,
  AdminOrganizerSurfaceList,
  AdminOrganizerSurfaceRow,
  AdminPanel,
  AdminSearchCandidateActions,
  AdminSearchCandidateCard,
  AdminSearchCandidateHeader,
  AdminSearchCandidateList,
  AdminSearchCandidatePanel,
  AdminSearchCandidateSnippet,
  AdminStateRow,
  AdminTag,
  AdminTagList,
  AdminWorkspace,
  AlertRow,
  EmptyState,
  QualityList,
  QualityRow,
  SearchField,
  StatusChip,
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

export const AdminIntakeLayoutStory: Story = {
  name: "Layout",
  parameters: {
    catchComponent: {
      id: "shared_admin_intake_layout",
      states: ["summary-and-list"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminIntakeLayout>
        <AdminIntakeSection>
          <AdminIntakeSectionTitle>
            <strong>Summary</strong>
            <span>12 candidates ready for review</span>
          </AdminIntakeSectionTitle>
          <AdminIntakeStateGrid>
            <AdminStateRow label="Ready" value="8" />
            <AdminStateRow label="Blocked" value="4" />
          </AdminIntakeStateGrid>
        </AdminIntakeSection>
        <AdminOrganizerIntakeList>
          <AdminOrganizerIntakeCard>Candidate list item</AdminOrganizerIntakeCard>
        </AdminOrganizerIntakeList>
      </AdminIntakeLayout>
    </AdminWorkspace>
  ),
};

export const AdminIntakeSectionStory: Story = {
  name: "Section",
  parameters: {
    catchComponent: {
      id: "shared_admin_intake_section",
      states: ["summary"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminIntakeSection>
        <AdminIntakeSectionTitle>
          <strong>Review summary</strong>
          <span>Bridge freshness and quality gates</span>
        </AdminIntakeSectionTitle>
        <QualityList>
          <QualityRow icon={<CheckCircle2 size={16} />} tone="success">
            <strong>Generated bridge loaded</strong>
            <span>Current source snapshot.</span>
          </QualityRow>
        </QualityList>
      </AdminIntakeSection>
    </AdminWorkspace>
  ),
};

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
      <AdminIntakeSectionTitle>
        <strong>Policy gates</strong>
        <span>4 warnings</span>
      </AdminIntakeSectionTitle>
    </AdminWorkspace>
  ),
};

export const AdminIntakeStateGridStory: Story = {
  name: "State grid",
  parameters: {
    catchComponent: {
      id: "shared_admin_intake_state_grid",
      states: ["metrics"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminIntakeStateGrid>
        <AdminStateRow label="Reviewed" value="24" />
        <AdminStateRow label="Ready" value="8" />
        <AdminStateRow label="Suppressed" value="2" />
      </AdminIntakeStateGrid>
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
      <AdminIntakeSourceList>
        <QualityRow icon={<Link2 size={16} />} tone="success">
          <strong>Instagram</strong>
          <span>Recent public event evidence.</span>
        </QualityRow>
        <QualityRow icon={<Link2 size={16} />} tone="warning">
          <strong>Website</strong>
          <span>Needs canonical URL confirmation.</span>
        </QualityRow>
      </AdminIntakeSourceList>
    </AdminWorkspace>
  ),
};

export const AdminIntakeGateListStory: Story = {
  name: "Gate list",
  parameters: {
    catchComponent: {
      id: "shared_admin_intake_gate_list",
      states: ["passed-and-blocked"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminIntakeGateList>
        <AdminIntakeGate tone="passed">
          <CheckCircle2 size={16} />
          <span>Public profile evidence found.</span>
        </AdminIntakeGate>
        <AdminIntakeGate tone="blocked">
          <FileWarning size={16} />
          <span>Missing city confidence.</span>
        </AdminIntakeGate>
      </AdminIntakeGateList>
    </AdminWorkspace>
  ),
};

export const AdminIntakeGateStory: Story = {
  name: "Gate",
  parameters: {
    catchComponent: {
      id: "shared_admin_intake_gate",
      states: ["passed", "blocked", "neutral"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminIntakeGate tone="passed">
        <CheckCircle2 size={16} />
        <span>Evidence verified</span>
      </AdminIntakeGate>
      <AdminIntakeGate tone="blocked">
        <FileWarning size={16} />
        <span>Policy hold required</span>
      </AdminIntakeGate>
      <AdminIntakeGate>
        <Sparkles size={16} />
        <span>Review note pending</span>
      </AdminIntakeGate>
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
      <AdminIntakeDecisionState>
        <CheckCircle2 size={16} />
        <div>
          <strong>approved for public listing</strong>
          <span>reviewDecisions/afterfly</span>
        </div>
      </AdminIntakeDecisionState>
    </AdminWorkspace>
  ),
};

export const AdminIntakeDecisionBoxStory: Story = {
  name: "Decision box",
  parameters: {
    catchComponent: {
      id: "shared_admin_intake_decision_box",
      states: ["note-and-actions"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminIntakeDecisionBox>
        <CatchField
          recipe="input"
          title="Decision note"
          onChanged={() => undefined}
          maxLines={3}
          value="Evidence is sufficient for curation approval."
        />
        <AdminIntakeDecisionActions>
          <AdminButton>Hold</AdminButton>
          <AdminButton variant="primary">Approve</AdminButton>
        </AdminIntakeDecisionActions>
      </AdminIntakeDecisionBox>
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
      <AdminIntakeDecisionActions>
        <AdminButton>Suppress</AdminButton>
        <AdminButton>Hold</AdminButton>
        <AdminButton variant="primary">Approve</AdminButton>
      </AdminIntakeDecisionActions>
    </AdminWorkspace>
  ),
};

export const AdminOrganizerIntakeCurationPanelStory: Story = {
  name: "Organizer curation panel",
  parameters: {
    catchComponent: {
      id: "shared_admin_organizer_intake_curation_panel",
      states: ["summary"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminOrganizerIntakeCurationPanel>
        <AdminIntakeSectionTitle>
          <strong>Organizer curation</strong>
          <span>Ready for review</span>
        </AdminIntakeSectionTitle>
        <AdminOrganizerIntakeBadges>
          <StatusChip tone="success">evidence</StatusChip>
          <StatusChip>claim ready</StatusChip>
        </AdminOrganizerIntakeBadges>
      </AdminOrganizerIntakeCurationPanel>
    </AdminWorkspace>
  ),
};

export const AdminOrganizerIntakeListStory: Story = {
  name: "Organizer list",
  parameters: {
    catchComponent: {
      id: "shared_admin_organizer_intake_list",
      states: ["cards"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminOrganizerIntakeList>
        <AdminOrganizerIntakeCard>Afterfly Social</AdminOrganizerIntakeCard>
        <AdminOrganizerIntakeCard>City Supper Club</AdminOrganizerIntakeCard>
      </AdminOrganizerIntakeList>
    </AdminWorkspace>
  ),
};

export const AdminOrganizerIntakeCardStory: Story = {
  name: "Organizer card",
  parameters: {
    catchComponent: {
      id: "shared_admin_organizer_intake_card",
      states: ["default", "with-decision"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminOrganizerIntakeCard>
        <AdminOrganizerIntakeCardHeader>
          <AdminIntakeSectionTitle>
            <strong>Afterfly Social</strong>
            <span>San Francisco</span>
          </AdminIntakeSectionTitle>
          <AdminOrganizerIntakeBadges>
            <StatusChip tone="success">ready</StatusChip>
          </AdminOrganizerIntakeBadges>
        </AdminOrganizerIntakeCardHeader>
        <AdminIntakeDecisionActions>
          <AdminButton>Hold</AdminButton>
          <AdminButton variant="primary">Approve</AdminButton>
        </AdminIntakeDecisionActions>
      </AdminOrganizerIntakeCard>
    </AdminWorkspace>
  ),
};

export const AdminOrganizerIntakeCardHeaderStory: Story = {
  name: "Organizer card header",
  parameters: {
    catchComponent: {
      id: "shared_admin_organizer_intake_card_header",
      states: ["title-and-badges"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminOrganizerIntakeCard>
        <AdminOrganizerIntakeCardHeader>
          <AdminIntakeSectionTitle>
            <strong>Afterfly Social</strong>
            <span>Profile confidence high</span>
          </AdminIntakeSectionTitle>
          <AdminOrganizerIntakeBadges>
            <StatusChip tone="success">verified</StatusChip>
            <StatusChip>external events</StatusChip>
          </AdminOrganizerIntakeBadges>
        </AdminOrganizerIntakeCardHeader>
      </AdminOrganizerIntakeCard>
    </AdminWorkspace>
  ),
};

export const AdminOrganizerIntakeBadgesStory: Story = {
  name: "Organizer badges",
  parameters: {
    catchComponent: {
      id: "shared_admin_organizer_intake_badges",
      states: ["mixed"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminOrganizerIntakeBadges>
        <StatusChip tone="success">ready</StatusChip>
        <StatusChip tone="warning">source gap</StatusChip>
        <StatusChip>owner handoff</StatusChip>
      </AdminOrganizerIntakeBadges>
    </AdminWorkspace>
  ),
};

export const AdminOrganizerPolicyGapColumnsStory: Story = {
  name: "Policy gap columns",
  parameters: {
    catchComponent: {
      id: "shared_admin_organizer_policy_gap_columns",
      states: ["two-columns"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminOrganizerPolicyGapColumns>
        <QualityList>
          <QualityRow icon={<CheckCircle2 size={16} />} tone="success">
            <strong>Profile safety</strong>
            <span>Passed.</span>
          </QualityRow>
        </QualityList>
        <QualityList>
          <QualityRow icon={<FileWarning size={16} />} tone="warning">
            <strong>Venue ambiguity</strong>
            <span>Needs manual confirmation.</span>
          </QualityRow>
        </QualityList>
      </AdminOrganizerPolicyGapColumns>
    </AdminWorkspace>
  ),
};

export const AdminOrganizerLocationResolutionFormStory: Story = {
  name: "Location resolution form",
  parameters: {
    catchComponent: {
      id: "shared_admin_organizer_location_resolution_form",
      states: ["fields"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminOrganizerLocationResolutionForm>
        <CatchField
          recipe="input"
          title="City"
          onChanged={() => undefined}
          value="San Francisco"
        />
        <CatchField
          recipe="input"
          title="Neighborhood"
          onChanged={() => undefined}
          value="SoMa"
        />
        <AdminButton icon={<MapPin size={16} />}>Resolve</AdminButton>
      </AdminOrganizerLocationResolutionForm>
    </AdminWorkspace>
  ),
};

export const AdminOrganizerIntakeSurfaceGridStory: Story = {
  name: "Organizer surface grid",
  parameters: {
    catchComponent: {
      id: "shared_admin_organizer_intake_surface_grid",
      states: ["surface-panels"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminOrganizerIntakeSurfaceGrid>
        <AdminPanel icon={<Users size={18} />} title="Profile">
          <AdminStateRow label="Completeness" value="86%" />
        </AdminPanel>
        <AdminPanel icon={<ShieldCheck size={18} />} title="Safety">
          <AdminStateRow label="Risk" value="Low" />
        </AdminPanel>
      </AdminOrganizerIntakeSurfaceGrid>
    </AdminWorkspace>
  ),
};

export const AdminOrganizerSurfaceListStory: Story = {
  name: "Organizer surface list",
  parameters: {
    catchComponent: {
      id: "shared_admin_organizer_surface_list",
      states: ["rows"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminOrganizerSurfaceList>
        <AdminOrganizerSurfaceRow>
          <strong>Instagram</strong>
          <span>Recent activity found.</span>
        </AdminOrganizerSurfaceRow>
        <AdminOrganizerSurfaceRow>
          <strong>Website</strong>
          <span>Needs canonical URL.</span>
        </AdminOrganizerSurfaceRow>
      </AdminOrganizerSurfaceList>
    </AdminWorkspace>
  ),
};

export const AdminOrganizerSurfaceRowStory: Story = {
  name: "Organizer surface row",
  parameters: {
    catchComponent: {
      id: "shared_admin_organizer_surface_row",
      states: ["text", "tagged"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminOrganizerSurfaceRow>
        <strong>Ticketing page</strong>
        <AdminTag tone="success">verified</AdminTag>
      </AdminOrganizerSurfaceRow>
    </AdminWorkspace>
  ),
};

export const AdminOrganizerCurationControlSectionStory: Story = {
  name: "Curation control section",
  parameters: {
    catchComponent: {
      id: "shared_admin_organizer_curation_control_section",
      states: ["controls"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminOrganizerCurationControlSection>
        <AdminIntakeSectionTitle>
          <strong>Curation controls</strong>
          <span>Apply reviewer overrides</span>
        </AdminIntakeSectionTitle>
        <AdminOrganizerCurationControlGrid>
          <AdminOrganizerIntakeCheckboxField checked label="Show as launch organizer" onChange={() => undefined} />
          <AdminOrganizerIntakeCheckboxField checked={false} label="Require source follow-up" onChange={() => undefined} />
        </AdminOrganizerCurationControlGrid>
      </AdminOrganizerCurationControlSection>
    </AdminWorkspace>
  ),
};

export const AdminOrganizerCurationControlGridStory: Story = {
  name: "Curation control grid",
  parameters: {
    catchComponent: {
      id: "shared_admin_organizer_curation_control_grid",
      states: ["checkboxes"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminOrganizerCurationControlGrid>
        <AdminOrganizerIntakeCheckboxField checked label="Feature in directory" onChange={() => undefined} />
        <AdminOrganizerIntakeCheckboxField checked={false} label="Hide public route" onChange={() => undefined} />
      </AdminOrganizerCurationControlGrid>
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

export const AdminSearchCandidatePanelStory: Story = {
  name: "Search candidate panel",
  parameters: {
    catchComponent: {
      id: "shared_admin_search_candidate_panel",
      states: ["search-and-results"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminSearchCandidatePanel>
        <SearchField ariaLabel="Search candidates" icon={<Search size={16} />} value="afterfly" />
        <AdminSearchCandidateList>
          <AdminSearchCandidateCard>Afterfly Social</AdminSearchCandidateCard>
        </AdminSearchCandidateList>
      </AdminSearchCandidatePanel>
    </AdminWorkspace>
  ),
};

export const AdminSearchCandidateListStory: Story = {
  name: "Search candidate list",
  parameters: {
    catchComponent: {
      id: "shared_admin_search_candidate_list",
      states: ["cards", "empty"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminSearchCandidateList>
        <AdminSearchCandidateCard>Afterfly Social</AdminSearchCandidateCard>
        <EmptyState>No duplicate candidates found.</EmptyState>
      </AdminSearchCandidateList>
    </AdminWorkspace>
  ),
};

export const AdminSearchCandidateCardStory: Story = {
  name: "Search candidate card",
  parameters: {
    catchComponent: {
      id: "shared_admin_search_candidate_card",
      states: ["default", "with-actions"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminSearchCandidateCard>
        <AdminSearchCandidateHeader>
          <strong>Afterfly Social</strong>
          <AdminTag tone="success">matched</AdminTag>
        </AdminSearchCandidateHeader>
        <AdminSearchCandidateSnippet>Public profile and imported source agree.</AdminSearchCandidateSnippet>
        <AdminSearchCandidateActions>
          <AdminButton>Dismiss</AdminButton>
          <AdminButton variant="primary">Use candidate</AdminButton>
        </AdminSearchCandidateActions>
      </AdminSearchCandidateCard>
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
      <AdminSearchCandidateCard>
        <AdminSearchCandidateHeader>
          <strong>Afterfly Social</strong>
          <AdminTag tone="success">96% match</AdminTag>
        </AdminSearchCandidateHeader>
      </AdminSearchCandidateCard>
    </AdminWorkspace>
  ),
};

export const AdminSearchCandidateSnippetStory: Story = {
  name: "Search candidate snippet",
  parameters: {
    catchComponent: {
      id: "shared_admin_search_candidate_snippet",
      states: ["default"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminSearchCandidateSnippet>
        Source bio, city, and event history match the existing organizer.
      </AdminSearchCandidateSnippet>
    </AdminWorkspace>
  ),
};

export const AdminSearchCandidateActionsStory: Story = {
  name: "Search candidate actions",
  parameters: {
    catchComponent: {
      id: "shared_admin_search_candidate_actions",
      states: ["actions"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminSearchCandidateActions>
        <AdminButton>Dismiss</AdminButton>
        <AdminButton variant="primary">Attach</AdminButton>
      </AdminSearchCandidateActions>
    </AdminWorkspace>
  ),
};
