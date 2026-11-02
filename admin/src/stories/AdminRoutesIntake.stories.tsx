import {sampleEventIntakeBridge} from "../shared/api/sampleOperationalData";
import type {EventIntakeBridge, EventIntakeCandidate, EventIntakeSourceProfile, EventIntakeSourceResult} from "../shared/types/adminTypes";
import type {EventIntakeController} from "../features/intake/events/controllers/useEventIntakeController";
import type {IntakeOperationsController} from "../features/intake/operations/controllers/useIntakeOperationsController";
import {sampleIntakeOperations} from "../shared/operations/sampleIntakeOperations";
import {organizerWorkbenchFromOperations} from "../features/intake/organizer/controllers/loadOrganizerIntakeBridge";
import type {OrganizerIntakeController} from "../features/intake/organizer/controllers/useOrganizerIntakeController";
import {AdminWorkspace} from "../shared/ui/AdminPrimitives";
import {EventIntakePreviewWorkspace} from "../features/intake/events/ui/EventIntakeWorkspace";
import {OrganizerIntakeWorkspace} from "../features/intake/organizer/ui/OrganizerIntakeScreen";
import {IntakeOperationsPreviewWorkspace} from "../features/intake/operations/ui/IntakeOperationsWorkspace";
import {IntakeWorkspace} from "../features/intake/ui/IntakeWorkspaceScreen";
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

const eventIntakeBridge =
  structuredClone(sampleEventIntakeBridge) as EventIntakeBridge;

const eventIntakeController: EventIntakeController = {
  bridge: eventIntakeBridge,
  errorMessage: null,
  inFlight: {},
  isError: false,
  isLoading: false,
  isRefreshing: false,
  loadBridge: async () => {
    noop();
    return true;
  },
  localDecisions: {},
  notes: {},
  snapshotVersion: 0,
  setNote: (_key: string, _value: string) => {
    noop();
  },
  sourceResultById: new Map(
    eventIntakeBridge.sourceResults.map((result) => [result.id, result])
  ),
  targetDecision: async (_input) => {
    noop();
    return true;
  },
  updateCandidate: (
    _candidateId: string,
    _patch: Partial<EventIntakeCandidate>
  ) => {
    noop();
  },
  updateSource: (
    _sourceId: string,
    _patch: Partial<EventIntakeSourceProfile>
  ) => {
    noop();
  },
  updateSourceResult: (
    _resultId: string,
    _patch: Partial<EventIntakeSourceResult>
  ) => {
    noop();
  },
};

const intakeOperationsController: IntakeOperationsController = {
  data: sampleIntakeOperations(),
  errorMessage: null,
  isError: false,
  isLoading: false,
  isRefreshing: false,
  isLoadingMore: false,
  loadMore: async () => false,
  refresh: async () => true,
};

const organizerSampleOperations = sampleIntakeOperations({
  entityKind: "organizer",
});

const organizerPreviewWorkItems = Array.from({length: 30}, (_, index) => {
  const base = structuredClone(
    organizerSampleOperations.workItems[
      index % organizerSampleOperations.workItems.length
    ]
  );
  const candidateId = `preview-organizer-${index + 1}`;
  const intake = base.normalizedPayload.intake as Record<string, unknown>;
  const candidate = intake.candidate as Record<string, unknown>;
  candidate.candidateId = candidateId;
  candidate.resultId = candidateId;
  candidate.rank = index + 1;
  candidate.title = index === 9 ? "Courtside" :
    `Organizer candidate ${index + 1}`;
  candidate.canonicalUrl = `https://${candidateId}.example/`;
  candidate.url = candidate.canonicalUrl;
  candidate.normalizedKey = `domain:${candidateId}.example`;
  candidate.existingEntityMatches = [];
  candidate.reviewContext = {
    recordStatus: "reviewed",
    existingInventory: false,
    formats: ["Social events"],
    sources: ["officialWebsite"],
    eventSignal: "Recent public event signal captured.",
    reviewNotes: "Reviewed source-backed organizer candidate.",
    verifiedAt: "2026-07-24",
  };
  base.workItemId = `work-${candidateId}`;
  base.externalKey = candidateId;
  return base;
});

const organizerIntakeBridge = organizerWorkbenchFromOperations(
  organizerSampleOperations,
  organizerPreviewWorkItems
);

const organizerIntakeController: OrganizerIntakeController = {
  availability: {
    searchCandidates: true,
    publicationPackets: false,
    canonicalItems: false,
    discoveryCandidateCount: organizerPreviewWorkItems.length,
    runIds: organizerSampleOperations.runs.map((run) => run.runId),
  },
  bridge: organizerIntakeBridge,
  source: "sample",
  curationForms: {},
  curationInFlight: {},
  decisionInFlight: {},
  decisionNotes: {},
  handleAttachCandidate: async (_candidate) => {
    noop();
    return true;
  },
  handleCreateOrganizerDraft: async (_candidate) => {
    noop();
  },
  handleDecision: async (_item, _decision) => {
    noop();
    return true;
  },
  handleItemCuration: async (_item, _form) => {
    noop();
  },
  handleOpenOrganizerDraft: (_organizerId) => {
    noop();
  },
  handleRetrySalesLink: async (_candidate) => false,
  handlePendingInputDecision: async (_input, _decision) => {
    noop();
  },
  handlePolicyGapDecision: async (_gap, _decision) => {
    noop();
  },
  localCuration: {},
  localDecisions: {},
  localOrganizerDrafts: {},
  localSalesLinks: {},
  localPolicyDecisions: {},
  manualReportAcknowledgements: {},
  organizerDraftForms: {},
  organizerDraftInFlight: {},
  salesLinkInFlight: {},
  selectedMatchByCandidate: {},
  policyDecisionInFlight: {},
  policyDecisionNotes: {},
  publicationPacketByEntity: new Map(
    organizerIntakeBridge.publicationReviewPackets.packets.map((packet) => [
      packet.entityId,
      packet,
    ])
  ),
  surfaceChecklists: {},
  visibilityForms: {},
  setCurationForms: (_value) => {
    noop();
  },
  setDecisionNotes: (_value) => {
    noop();
  },
  setManualReportAcknowledgements: (_value) => {
    noop();
  },
  setOrganizerDraftForms: (_value) => {
    noop();
  },
  setSelectedMatchByCandidate: (_value) => {
    noop();
  },
  setPolicyDecisionNotes: (_value) => {
    noop();
  },
  setSurfaceChecklists: (_value) => {
    noop();
  },
  setVisibilityForms: (_value) => {
    noop();
  },
};

const organizerIntakePreviewNowMs = Date.parse("2026-07-27T12:00:00.000Z");

const renderEventIntakeWorkspace = () => (
  <AdminWorkspace>
    <EventIntakePreviewWorkspace controller={eventIntakeController} />
  </AdminWorkspace>
);

const renderOrganizerIntakeWorkspace = () => (
  <AdminWorkspace>
    <OrganizerIntakeWorkspace
      controller={organizerIntakeController}
      nowMs={organizerIntakePreviewNowMs}
    />
  </AdminWorkspace>
);

const renderIntakeOperationsWorkspace = () => (
  <AdminWorkspace>
    <IntakeOperationsPreviewWorkspace
      controller={intakeOperationsController}
    />
  </AdminWorkspace>
);

const renderIntakeWorkspace = () => (
  <AdminWorkspace>
    <IntakeWorkspace
      activeWorkspace="events"
      eventsContent={<EventIntakePreviewWorkspace controller={eventIntakeController} />}
      operationsContent={<IntakeOperationsPreviewWorkspace controller={intakeOperationsController} />}
      organizersContent={(
        <OrganizerIntakeWorkspace
          controller={organizerIntakeController}
          nowMs={organizerIntakePreviewNowMs}
        />
      )}
      onWorkspaceChange={noop}
    />
  </AdminWorkspace>
);

// Intake ages and countdowns read both Date.now() and new Date(). Pin both to
// the reviewed baseline capture (13d oldest, 2099 sample in 26655d) so
// captures do not drift as real days pass.
const installIntakeBaselineClock = () => {
  const RealDate = globalThis.Date;
  const fixedMs = RealDate.parse("2026-07-27T12:00:00.000Z");
  class BaselineDate extends RealDate {
    constructor(...args: [] | [string | number | Date]) {
      if (args.length === 0) super(fixedMs);
      else super(args[0]);
    }

    static now() {
      return fixedMs;
    }
  }
  globalThis.Date = BaselineDate as DateConstructor;
  return () => {
    globalThis.Date = RealDate;
  };
};

export const IntakeWorkspaceRouteStory: Story = {
  name: "Intake",
  beforeEach: installIntakeBaselineClock,
  parameters: {
    catchComponent: {
      id: "route_intake_workspace",
      states: ["event-review"],
    },
  },
  render: renderIntakeWorkspace,
};

export const IntakeWorkspaceStory: Story = {
  name: "Intake Workspace Shell",
  beforeEach: installIntakeBaselineClock,
  parameters: {
    catchComponent: {
      id: "workspace_intake_workspace",
      states: ["event-review"],
    },
  },
  render: renderIntakeWorkspace,
};

export const EventIntakeWorkspaceStory: Story = {
  name: "Event Intake Workspace",
  beforeEach: installIntakeBaselineClock,
  parameters: {
    catchComponent: {
      id: "workspace_event_intake",
      states: ["default", "run-plan", "source-review"],
    },
  },
  render: renderEventIntakeWorkspace,
};

export const OrganizerIntakeRouteStory: Story = {
  name: "Organizer Intake",
  parameters: {
    catchComponent: {
      id: "route_organizer_intake",
      states: [
        "default",
        "workflow-readiness",
        "publication-packets",
        "scrollable-candidate-queue",
        "organizer-draft-creation",
      ],
    },
  },
  render: renderOrganizerIntakeWorkspace,
};

export const OrganizerIntakeWorkspaceStory: Story = {
  name: "Organizer Intake Workspace",
  parameters: {
    catchComponent: {
      id: "workspace_organizer_intake",
      states: [
        "default",
        "workflow-readiness",
        "publication-packets",
        "scrollable-candidate-queue",
        "organizer-draft-creation",
      ],
    },
  },
  render: renderOrganizerIntakeWorkspace,
};

export const IntakeOperationsWorkspaceStory: Story = {
  name: "Supply Intake Automation Workspace",
  beforeEach: installIntakeBaselineClock,
  parameters: {
    catchComponent: {
      id: "workspace_intake_operations",
      states: ["default", "human-review", "read-only-boundary"],
    },
  },
  render: renderIntakeOperationsWorkspace,
};
