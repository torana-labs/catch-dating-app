import {
  CatchAdminCommandRow,
  CatchAdminCommandStack,
  CatchBadge,
  CatchField,
} from "@catch/web-ui";
import type {Meta, StoryObj} from "@storybook/react-vite";
import {
  Activity,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Eye,
  FileWarning,
  Image as ImageIcon,
  Link2,
  LineChart,
  Lock,
  Megaphone,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  Upload,
} from "lucide-react";
import {
  AdminButton,
  AdminCard,
  AdminChecklistCopy,
  AdminChecklistHeader,
  AdminChecklistStack,
  AdminDiffList,
  AdminDiffRow,
  AdminEditorGrid,
  AdminEditorPanel,
  AdminEditorSection,
  AdminFieldGrid,
  AdminEventSupplyDetail,
  AdminEventSupplyEmptyState,
  AdminEventSupplyLinks,
  AdminEventSupplyReviewGrid,
  AdminFeatureDropCaptureThumb,
  AdminFeatureDropControlGrid,
  AdminFeatureDropFeatureEditor,
  AdminFeatureDropFeatureList,
  AdminFeatureDropPreviewCard,
  AdminFeatureDropPreviewGrid,
  AdminFeatureDropWideField,
  AdminFilterBar,
  AdminMutedCell,
  AdminOverviewAnalyticsClearButton,
  AdminOverviewMainGrid,
  AdminOverviewQueueDecisionButton,
  AdminOverviewQueueDetailPanel,
  AdminOverviewQueueItems,
  AdminOverviewQueueRow,
  AdminOverviewQueueRowActions,
  AdminPublishingLoadbar,
  AdminQueryList,
  AdminQueryRow,
  AdminRoadmapList,
  AdminRoadmapListItem,
  AdminStateRow,
  AdminSurfacePreview,
  AdminTagList,
  AdminWorkspace,
  AlertRow,
  DataTable,
  DecisionFooter,
  EmptyState,
  Panel,
  QualityList,
  QualityRow,
  StateRow,
} from "../shared/ui/AdminPrimitives";

const imageData =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 320 180'%3E%3Crect width='320' height='180' fill='%23f6f1e8'/%3E%3Ccircle cx='88' cy='84' r='42' fill='%236756ff'/%3E%3Crect x='154' y='54' width='110' height='18' rx='9' fill='%23191824'/%3E%3Crect x='154' y='88' width='78' height='14' rx='7' fill='%237c7a86'/%3E%3Crect x='154' y='118' width='96' height='14' rx='7' fill='%23d96c52'/%3E%3C/svg%3E";

const noop = () => undefined;
const recordDecision = async () => undefined;

const meta = {
  title: "Admin Dashboard/Operations Primitives",
  parameters: {
    catchComponentRegistry: {
      path: "design/admin/components.json",
    },
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const AdminOverviewMainGridStory: Story = {
  name: "Overview main grid",
  parameters: {
    catchComponent: {
      id: "shared_admin_overview_main_grid",
      states: ["summary-and-detail"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminOverviewMainGrid aria-label="Admin overview">
        <AdminCard>
          <AdminStateRow label="Queued" value="12" />
          <AdminStateRow label="Escalated" value="3" />
        </AdminCard>
        <AdminOverviewQueueDetailPanel>
          <QualityList>
            <QualityRow icon={<Activity size={16} />} tone="success">
              Queue freshness under five minutes.
            </QualityRow>
          </QualityList>
        </AdminOverviewQueueDetailPanel>
      </AdminOverviewMainGrid>
    </AdminWorkspace>
  ),
};

export const AdminOverviewAnalyticsClearButtonStory: Story = {
  name: "Analytics clear button",
  parameters: {
    catchComponent: {
      id: "shared_admin_overview_analytics_clear_button",
      states: ["default"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminOverviewAnalyticsClearButton onClick={noop}>
        Clear filters
      </AdminOverviewAnalyticsClearButton>
    </AdminWorkspace>
  ),
};

export const AdminOverviewQueueItemsStory: Story = {
  name: "Queue items",
  parameters: {
    catchComponent: {
      id: "shared_admin_overview_queue_items",
      states: ["stacked"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminOverviewQueueItems>
        <AdminOverviewQueueRow intent="warning">Policy evidence pending</AdminOverviewQueueRow>
        <AdminOverviewQueueRow intent="neutral">Source links verified</AdminOverviewQueueRow>
      </AdminOverviewQueueItems>
    </AdminWorkspace>
  ),
};

export const AdminOverviewQueueRowStory: Story = {
  name: "Queue row",
  parameters: {
    catchComponent: {
      id: "shared_admin_overview_queue_row",
      states: ["neutral", "warning", "selected"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminOverviewQueueItems>
        <AdminOverviewQueueRow intent="neutral">Standard review item</AdminOverviewQueueRow>
        <AdminOverviewQueueRow intent="warning">Needs evidence follow-up</AdminOverviewQueueRow>
        <AdminOverviewQueueRow intent="danger" selected>
          Policy escalation selected
        </AdminOverviewQueueRow>
      </AdminOverviewQueueItems>
    </AdminWorkspace>
  ),
};

export const AdminOverviewQueueRowActionsStory: Story = {
  name: "Queue row actions",
  parameters: {
    catchComponent: {
      id: "shared_admin_overview_queue_row_actions",
      states: ["actions"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminOverviewQueueRowActions>
        <AdminButton>Open</AdminButton>
        <AdminButton variant="primary">Assign</AdminButton>
      </AdminOverviewQueueRowActions>
    </AdminWorkspace>
  ),
};

export const AdminOverviewQueueDecisionButtonStory: Story = {
  name: "Queue decision button",
  parameters: {
    catchComponent: {
      id: "shared_admin_overview_queue_decision_button",
      states: ["default"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminOverviewQueueDecisionButton onClick={noop}>
        Mark reviewed
      </AdminOverviewQueueDecisionButton>
    </AdminWorkspace>
  ),
};

export const AdminOverviewQueueDetailPanelStory: Story = {
  name: "Queue detail panel",
  parameters: {
    catchComponent: {
      id: "shared_admin_overview_queue_detail_panel",
      states: ["details"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminOverviewQueueDetailPanel aria-label="Queue detail">
        <StateRow label="Owner" value="Ops" />
        <StateRow label="Status" value="Needs source check" />
      </AdminOverviewQueueDetailPanel>
    </AdminWorkspace>
  ),
};

export const AdminPublishingLoadbarStory: Story = {
  name: "Publishing loadbar",
  parameters: {
    catchComponent: {
      id: "shared_admin_publishing_loadbar",
      states: ["loaded"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminPublishingLoadbar>
        <span>Publication packet loaded</span>
        <CatchBadge recipe="status" tone="success" label="Synced" />
      </AdminPublishingLoadbar>
    </AdminWorkspace>
  ),
};

export const AdminSurfacePreviewStory: Story = {
  name: "Surface preview",
  parameters: {
    catchComponent: {
      id: "shared_admin_surface_preview",
      states: ["listing-preview"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminSurfacePreview>
        <AdminTagList>
          <CatchBadge label="public listing" />
          <CatchBadge recipe="status" tone="success" label="claim CTA" />
        </AdminTagList>
        <QualityRow icon={<Eye size={16} />} tone="success">
          Preview copy matches the generated route payload.
        </QualityRow>
      </AdminSurfacePreview>
    </AdminWorkspace>
  ),
};

export const AdminMutedCellStory: Story = {
  name: "Muted cell",
  parameters: {
    catchComponent: {
      id: "shared_admin_muted_cell",
      states: ["inline"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminMutedCell>Last checked 3 minutes ago</AdminMutedCell>
    </AdminWorkspace>
  ),
};

export const AdminEventSupplyReviewGridStory: Story = {
  name: "Event supply review grid",
  parameters: {
    catchComponent: {
      id: "shared_admin_event_supply_review_grid",
      states: ["table-and-detail"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminEventSupplyReviewGrid>
        <DataTable ariaLabel="Event supply review" compact variant="workbench">
          <tbody>
            <tr>
              <td>Venue import</td>
              <td><CatchBadge recipe="status" tone="warning" label="Review" /></td>
            </tr>
          </tbody>
        </DataTable>
        <AdminEventSupplyDetail>
          <StateRow label="Source" value="Partner feed" />
        </AdminEventSupplyDetail>
      </AdminEventSupplyReviewGrid>
    </AdminWorkspace>
  ),
};

export const AdminEventSupplyDetailStory: Story = {
  name: "Event supply detail",
  parameters: {
    catchComponent: {
      id: "shared_admin_event_supply_detail",
      states: ["aside"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminEventSupplyDetail>
        <QualityList>
          <QualityRow icon={<CalendarDays size={16} />} tone="success">
            Event timing is inside the publication window.
          </QualityRow>
        </QualityList>
      </AdminEventSupplyDetail>
    </AdminWorkspace>
  ),
};

export const AdminEventSupplyLinksStory: Story = {
  name: "Event supply links",
  parameters: {
    catchComponent: {
      id: "shared_admin_event_supply_links",
      states: ["actions"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminEventSupplyLinks>
        <AdminButton icon={<Link2 size={16} />}>Source</AdminButton>
        <AdminButton icon={<Eye size={16} />}>Preview</AdminButton>
      </AdminEventSupplyLinks>
    </AdminWorkspace>
  ),
};

export const AdminCommandStackStory: Story = {
  name: "Command stack",
  parameters: {
    catchComponent: {
      id: "shared_admin_command_stack",
      states: ["commands"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <CatchAdminCommandStack>
        <CatchAdminCommandRow>
          <strong>Refresh dashboard</strong>
          <AdminButton icon={<RefreshCw size={16} />}>Run</AdminButton>
        </CatchAdminCommandRow>
        <CatchAdminCommandRow>
          <strong>Publish selected</strong>
          <AdminButton variant="primary">Publish</AdminButton>
        </CatchAdminCommandRow>
      </CatchAdminCommandStack>
    </AdminWorkspace>
  ),
};

export const AdminCommandRowStory: Story = {
  name: "Command row",
  parameters: {
    catchComponent: {
      id: "shared_admin_command_row",
      states: ["with-action"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <CatchAdminCommandRow>
        <span>Regenerate route manifest</span>
        <AdminButton>Queue job</AdminButton>
      </CatchAdminCommandRow>
    </AdminWorkspace>
  ),
};

export const AdminChecklistStackStory: Story = {
  name: "Checklist stack",
  parameters: {
    catchComponent: {
      id: "shared_admin_checklist_stack",
      states: ["checks"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminChecklistStack>
        <AlertRow icon={<CheckCircle2 size={16} />} title="Route contract" tone="success">
          Public path is present.
        </AlertRow>
        <AlertRow icon={<FileWarning size={16} />} title="Claim copy" tone="warning">
          Needs owner review.
        </AlertRow>
      </AdminChecklistStack>
    </AdminWorkspace>
  ),
};

export const AdminChecklistHeaderStory: Story = {
  name: "Checklist header",
  parameters: {
    catchComponent: {
      id: "shared_admin_checklist_header",
      states: ["incomplete"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminChecklistHeader label="Publication checks" detail="3 tasks remaining" />
    </AdminWorkspace>
  ),
};

export const AdminChecklistCopyStory: Story = {
  name: "Checklist copy",
  parameters: {
    catchComponent: {
      id: "shared_admin_checklist_copy",
      states: ["actionable"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminChecklistCopy
        label="Source evidence verified"
        detail="Open the captured source and confirm it supports the listing."
      />
    </AdminWorkspace>
  ),
};

export const AdminEditorGridStory: Story = {
  name: "Editor grid",
  parameters: {
    catchComponent: {
      id: "shared_admin_editor_grid",
      states: ["section", "div"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminEditorGrid aria-label="Publishing editor">
        <CatchField recipe="input" title="Title" value="Friday Social" onChanged={noop} />
        <CatchField recipe="input" title="Slug" value="friday-social" onChanged={noop} />
      </AdminEditorGrid>
      <AdminEditorGrid as="div">
        <CatchField
          recipe="input"
          title="Review note"
          maxLines={3}
          value="Approved with source evidence."
          onChanged={noop}
        />
      </AdminEditorGrid>
    </AdminWorkspace>
  ),
};

export const AdminFilterBarStory: Story = {
  name: "Filter bar",
  parameters: {
    catchComponent: {
      id: "shared_admin_filter_bar",
      states: ["controls"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminFilterBar ariaLabel="Overview filters">
        <AdminButton selected>All</AdminButton>
        <AdminButton>Blocked</AdminButton>
        <AdminOverviewAnalyticsClearButton onClick={noop}>
          Reset
        </AdminOverviewAnalyticsClearButton>
      </AdminFilterBar>
    </AdminWorkspace>
  ),
};

export const AdminEventSupplyEmptyStateStory: Story = {
  name: "Event supply empty state",
  parameters: {
    catchComponent: {
      id: "shared_admin_event_supply_empty_state",
      states: ["empty"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminEventSupplyEmptyState icon={<CalendarDays size={18} />}>
        Select an event candidate to inspect its source evidence.
      </AdminEventSupplyEmptyState>
    </AdminWorkspace>
  ),
};

export const AdminDiffListStory: Story = {
  name: "Diff list",
  parameters: {
    catchComponent: {
      id: "shared_admin_diff_list",
      states: ["rows"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminDiffList>
        <AdminDiffRow field="Title" before="Old meetup" after="Friday Social" />
        <AdminDiffRow field="CTA" before="Join" after="Claim listing" />
      </AdminDiffList>
    </AdminWorkspace>
  ),
};

export const AdminDiffRowStory: Story = {
  name: "Diff row",
  parameters: {
    catchComponent: {
      id: "shared_admin_diff_row",
      states: ["before-after"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminDiffRow field="Status" before="Draft" after="Ready" />
    </AdminWorkspace>
  ),
};

export const AdminRoadmapListStory: Story = {
  name: "Roadmap list",
  parameters: {
    catchComponent: {
      id: "shared_admin_roadmap_list",
      states: ["items"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminRoadmapList>
        <AdminRoadmapListItem>Move public route copy to generated contract.</AdminRoadmapListItem>
        <AdminRoadmapListItem>Promote claim CTA once ownership is verified.</AdminRoadmapListItem>
      </AdminRoadmapList>
    </AdminWorkspace>
  ),
};

export const AdminRoadmapListItemStory: Story = {
  name: "Roadmap list item",
  parameters: {
    catchComponent: {
      id: "shared_admin_roadmap_list_item",
      states: ["single"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminRoadmapListItem>Backfill listing screenshots after route launch.</AdminRoadmapListItem>
    </AdminWorkspace>
  ),
};

export const AdminQueryListStory: Story = {
  name: "Query list",
  parameters: {
    catchComponent: {
      id: "shared_admin_query_list",
      states: ["rows"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminQueryList>
        <AdminQueryRow>
          <strong>Publishing queue</strong>
          <span>Ready organizers by confidence tier.</span>
        </AdminQueryRow>
        <AdminQueryRow>
          <strong>Claim requests</strong>
          <span>Open claims needing staff review.</span>
        </AdminQueryRow>
      </AdminQueryList>
    </AdminWorkspace>
  ),
};

export const AdminQueryRowStory: Story = {
  name: "Query row",
  parameters: {
    catchComponent: {
      id: "shared_admin_query_row",
      states: ["query"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminQueryRow>
        <strong>Recent public listings</strong>
        <span>Generated route status, owner, and last publish time.</span>
      </AdminQueryRow>
    </AdminWorkspace>
  ),
};

export const AdminFeatureDropFeatureListStory: Story = {
  name: "Feature drop feature list",
  parameters: {
    catchComponent: {
      id: "shared_admin_feature_drop_feature_list",
      states: ["features"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminFeatureDropFeatureList>
        <AdminFeatureDropFeatureEditor>
          <strong>Organizer profiles</strong>
          <AdminTagList>
            <CatchBadge recipe="status" tone="success" label="ready" />
            <CatchBadge label="public route" />
          </AdminTagList>
        </AdminFeatureDropFeatureEditor>
      </AdminFeatureDropFeatureList>
    </AdminWorkspace>
  ),
};

export const AdminFeatureDropFeatureEditorStory: Story = {
  name: "Feature drop feature editor",
  parameters: {
    catchComponent: {
      id: "shared_admin_feature_drop_feature_editor",
      states: ["fields"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminFeatureDropFeatureEditor>
        <CatchField
          recipe="input"
          title="Feature title"
          value="Claim-ready profiles"
          onChanged={noop}
        />
        <CatchField
          recipe="input"
          title="Feature copy"
          maxLines={3}
          value="Public listing copy backed by source evidence and owner handoff."
          onChanged={noop}
        />
      </AdminFeatureDropFeatureEditor>
    </AdminWorkspace>
  ),
};

export const AdminFeatureDropControlGridStory: Story = {
  name: "Feature drop control grid",
  parameters: {
    catchComponent: {
      id: "shared_admin_feature_drop_control_grid",
      states: ["controls"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminFeatureDropControlGrid>
        <CatchField recipe="input" title="Campaign" value="Organizer launch" onChanged={noop} />
        <CatchField recipe="input" title="Audience" value="Hosts" onChanged={noop} />
        <AdminFeatureDropWideField>
          <CatchField
            recipe="input"
            title="Announcement copy"
            maxLines={3}
            value="Invite verified organizers to claim and maintain their public listing."
            onChanged={noop}
          />
        </AdminFeatureDropWideField>
      </AdminFeatureDropControlGrid>
    </AdminWorkspace>
  ),
};

export const AdminFeatureDropWideFieldStory: Story = {
  name: "Feature drop wide field",
  parameters: {
    catchComponent: {
      id: "shared_admin_feature_drop_wide_field",
      states: ["wide-field"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminFeatureDropControlGrid>
        <AdminFeatureDropWideField>
          <CatchField
            recipe="input"
            title="Long-form copy"
            maxLines={4}
            value="Use this area for the complete launch narrative."
            onChanged={noop}
          />
        </AdminFeatureDropWideField>
      </AdminFeatureDropControlGrid>
    </AdminWorkspace>
  ),
};

export const AdminFeatureDropPreviewGridStory: Story = {
  name: "Feature drop preview grid",
  parameters: {
    catchComponent: {
      id: "shared_admin_feature_drop_preview_grid",
      states: ["cards"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminFeatureDropPreviewGrid>
        <AdminFeatureDropPreviewCard>
          <AdminFeatureDropCaptureThumb src={imageData} alt="Organizer feature preview" />
          <figcaption>Organizer claim launch</figcaption>
        </AdminFeatureDropPreviewCard>
        <AdminFeatureDropPreviewCard>
          <EmptyState icon={<ImageIcon size={18} />}>Awaiting capture</EmptyState>
        </AdminFeatureDropPreviewCard>
      </AdminFeatureDropPreviewGrid>
    </AdminWorkspace>
  ),
};

export const AdminFeatureDropPreviewCardStory: Story = {
  name: "Feature drop preview card",
  parameters: {
    catchComponent: {
      id: "shared_admin_feature_drop_preview_card",
      states: ["image", "empty"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminFeatureDropPreviewCard>
        <AdminFeatureDropCaptureThumb src={imageData} alt="Feature capture" />
        <figcaption>Claim CTA preview</figcaption>
      </AdminFeatureDropPreviewCard>
    </AdminWorkspace>
  ),
};

export const AdminFeatureDropCaptureThumbStory: Story = {
  name: "Feature drop capture thumb",
  parameters: {
    catchComponent: {
      id: "shared_admin_feature_drop_capture_thumb",
      states: ["image"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminFeatureDropCaptureThumb src={imageData} alt="Feature capture thumbnail" />
    </AdminWorkspace>
  ),
};

export const AdminEditorSectionStory: Story = {
  name: "Editor section",
  parameters: {
    catchComponent: {
      id: "shared_admin_editor_section",
      states: ["fieldset"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminEditorSection>
        <legend>Review fields</legend>
        <AdminFieldGrid columns={1}>
          <CatchField
            recipe="input"
            title="Canonical owner"
            value="Organizer team"
            onChanged={noop}
          />
        </AdminFieldGrid>
      </AdminEditorSection>
    </AdminWorkspace>
  ),
};

export const PanelStory: Story = {
  name: "Panel",
  parameters: {
    catchComponent: {
      id: "shared_panel",
      states: ["default", "action"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <Panel
        action={<AdminButton>Inspect</AdminButton>}
        icon={<ShieldCheck size={18} />}
        title="Publication guardrails"
      >
        <QualityList>
          <QualityRow icon={<Lock size={16} />}>Claim handoff remains staff reviewed.</QualityRow>
        </QualityList>
      </Panel>
    </AdminWorkspace>
  ),
};

export const AdminEditorPanelStory: Story = {
  name: "Editor panel",
  parameters: {
    catchComponent: {
      id: "shared_admin_editor_panel",
      states: ["editor", "wide"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminEditorPanel
        action={<AdminButton variant="primary">Save</AdminButton>}
        icon={<ClipboardList size={18} />}
        span={2}
        title="Listing editor"
      >
        <AdminEditorGrid as="div">
          <CatchField
            recipe="input"
            title="Listing title"
            value="Rooftop Social"
            onChanged={noop}
          />
          <CatchField
            recipe="input"
            title="Path"
            value="/organizers/rooftop-social"
            onChanged={noop}
          />
        </AdminEditorGrid>
      </AdminEditorPanel>
    </AdminWorkspace>
  ),
};

export const StateRowStory: Story = {
  name: "State row",
  parameters: {
    catchComponent: {
      id: "shared_state_row",
      states: ["with-value", "empty"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <StateRow label="Canonical path" value="/organizers/rooftop-social" />
      <StateRow label="Owner claim" value={null} />
    </AdminWorkspace>
  ),
};

export const DecisionFooterStory: Story = {
  name: "Decision footer",
  parameters: {
    catchComponent: {
      id: "shared_decision_footer",
      states: ["editable", "approved", "blocked"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <DecisionFooter
        defaultNote="Reviewed by staff."
        edits={{publicListing: true}}
        note="Approve once claim copy is final."
        showExportReady
        targetId="organizer-rooftop-social"
        targetType="organizer"
        onDecision={recordDecision}
        onNoteChange={noop}
      />
      <DecisionFooter
        defaultNote="Already approved."
        edits={{}}
        localDecision={{
          decisionPath: "reviewDecisions/organizer-rooftop-social",
          decisionStatus: "approved",
        }}
        note=""
        targetId="organizer-rooftop-social"
        targetType="organizer"
        onDecision={recordDecision}
        onNoteChange={noop}
      />
      <DecisionFooter
        approvalDisabledReason="Source evidence is missing."
        defaultNote="Blocked until evidence is attached."
        edits={{needsEvidence: true}}
        note="Waiting on source URL."
        targetId="event-import-1"
        targetType="event"
        onDecision={recordDecision}
        onNoteChange={noop}
      />
    </AdminWorkspace>
  ),
};
