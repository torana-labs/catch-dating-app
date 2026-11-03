import {
  CatchAdminCommandRow,
  CatchAdminCommandStack,
  CatchBadge,
  CatchField,
  CatchGap,
  CatchTable,
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
  AdminQueryList,
  AdminQueryRow,
  AdminStateRow,
  AdminWorkspace,
  AlertRow,
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
        <CatchTable
          columns={[{key: "source", label: "Source"}, {key: "status", label: "Status", kind: "badge"}]}
          label="Event supply review"
          rowKey={(row) => row.source}
          rows={[{source: "Venue import", status: {recipe: "status", tone: "warning", label: "Review"}}]}
        />
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
          <CatchGap direction="horizontal" size="inline" wrap>
            <CatchBadge recipe="status" tone="success" label="ready" />
            <CatchBadge label="public route" />
          </CatchGap>
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
