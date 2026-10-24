import {useEffect, useMemo, useState} from "react";
import {useSearchParams} from "react-router";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Database,
  ExternalLink,
  FileWarning,
  FolderSearch,
  Lock,
  MapPin,
  RefreshCw,
  Save,
  Search,
  Settings2,
  Smartphone,
} from "lucide-react";
import type {
  AdminEventActivityKind,
  AdminEventDetails,
  AdminEventInteractionModel,
  AdminEventListRow,
  AdminExternalEventListRow,
  AdminEventPace,
  ExternalEventImportAction,
  ExternalEventImportExecutionAction,
  ExternalEventImportExecutionPlan,
  ExternalEventImportPlan,
} from "../../../shared/types/adminTypes";
import {
  AdminButton,
  AdminDiffList,
  AdminDiffRow,
  AdminDetailScreenStack,
  AdminDirectoryScreenStack,
  AdminEditorGrid,
  AdminEditorPanel,
  AdminFieldGrid,
  AdminForm,
  AdminEventSupplyDetail,
  AdminEventSupplyEmptyState,
  AdminEventSupplyLinks,
  AdminEventSupplyReviewGrid,
  AdminLinkButton,
  AdminMetricCard,
  AdminMetricGrid,
  AdminRoadmapList,
  AdminRoadmapListItem,
  AdminStatusGrid,
  AdminTableRow,
  AdminTag,
  AdminToolbar,
  AdminWorkbenchStack,
  CheckboxField,
  DataTable,
  EmptyState,
  PageHeader,
  Panel,
  QualityList,
  QualityRow,
  SearchField,
  SegmentedControl,
  StateRow,
  StatusChip,
  TableActionButton,
  AdminCommandRow,
  AdminCommandStack,
  AdminEyebrow,
  AdminEditorSection,
  AdminTagList,
  AdminIntakeSection,
  AdminIntakeSectionTitle,
  AdminIntakeSourceList,
  AdminSearchCandidateHeader,
  AdminSearchCandidatePanel,
  AdminIntakeStateGrid,
  AdminMutedCell,
  AdminPublishingLoadbar,
  AdminRowTitle,
  AdminSurfacePreview,
  AdminTagRow,
} from "../../../shared/ui/AdminPrimitives";
import {
  type ExternalEventPublishRequest,
  type ExternalEventSupplyFilter,
  type EventPublishingController,
  type EventPublishingFilter,
  type EventPublishingWorkspace as EventPublishingWorkspaceId,
  useEventPublishingController,
} from "../controllers/useEventPublishingController";
import {
  countBlockingEventIssues,
  countEventDiffRows,
  eventActivityKindOptions,
  eventInteractionModelOptions,
  eventIsFull,
  eventNeedsSearchBackfill,
  eventPaceOptions,
  externalEventNeedsReview,
  formatEventLabel,
  type EventDiffRow,
  type ExternalEventImportReview,
  type EventPublishingFormState,
  type EventValidationIssue,
} from "../controllers/eventPublishingHelpers";
import {isLaunchMarketId} from "../../../shared/config/launchMarkets";
import {useAdminFeedback} from "../../../shared/feedback/AdminFeedbackContext";
import {eventPublishingDirectoryPanels} from "./eventPublishingDirectoryPanels";
import {eventPublishingSupplyPanels} from "./eventPublishingSupplyPanels";
import {eventPublishingReadinessPanels} from "./eventPublishingReadinessPanels";
import {eventPublishingEditorPanels} from "./eventPublishingEditorPanels";
// Panels from "./eventPublishingDirectoryPanels.tsx" and sibling modules stay feature-private.


type EventImportReadinessFilter =
  | "needsAction"
  | "writeReady"
  | "blocked"
  | "waitingReview"
  | "rejected"
  | "all";

interface EventImportReadinessRow {
  key: string;
  title: string;
  platform: string;
  status: ExternalEventImportAction["status"];
  executionStatus: ExternalEventImportExecutionAction["status"] | null;
  targetPath: string;
  candidateId: string;
  sourceEventKey: string;
  canonicalHostId: string;
  startTime: string | null;
  outboundLinkCount: number;
  primaryExternalUrl: string | null;
  blockers: string[];
  validationErrorCount: number;
  sourceActionId: string;
  publishReady: boolean;
}
export function EventPublishingScreen({
  activeWorkspace = "directory",
  onBackToList,
  onSelectEventId,
  onSelectExternalEventId,
  onSelectReadinessActionId,
  onWorkspaceChange,
  selectedEventId,
  selectedExternalEventId,
  selectedReadinessActionId,
}: {
  activeWorkspace?: EventPublishingWorkspaceId;
  onBackToList?: () => void;
  onSelectEventId?: (eventId: string) => void;
  onSelectExternalEventId?: (eventId: string | null) => void;
  onSelectReadinessActionId?: (sourceActionId: string | null) => void;
  onWorkspaceChange?: (workspace: EventPublishingWorkspaceId) => void;
  selectedEventId?: string | null;
  selectedExternalEventId?: string | null;
  selectedReadinessActionId?: string | null;
}) {
  const {setError: onError, setNotice: onNotice} = useAdminFeedback();
  const [searchParams, setSearchParams] = useSearchParams();
  const controller = useEventPublishingController({
    activeWorkspace,
    onBackToList,
    onError,
    onNotice,
    onSelectEventId,
    onSelectExternalEventId,
    onSelectReadinessActionId,
    onWorkspaceChange,
    selectedEventId,
    selectedExternalEventId,
    selectedReadinessActionId,
  });

  useEffect(() => {
    const routeFilter = searchParams.get("filter");
    const routeQuery = searchParams.get("q") ?? "";
    if (activeWorkspace === "external") {
      controller.setExternalFilter(
        isExternalEventSupplyFilter(routeFilter) ? routeFilter : "public"
      );
      controller.setExternalQuery(routeQuery);
      return;
    }
    if (activeWorkspace === "directory") {
      controller.setFilter(
        isEventPublishingFilter(routeFilter) ? routeFilter : "launchCities"
      );
      controller.setQuery(routeQuery);
    }
  }, [activeWorkspace, searchParams]);

  const updateSearchParam = (
    key: "filter" | "q",
    value: string,
    defaultValue = ""
  ) => {
    const next = new URLSearchParams(searchParams);
    if (!value || value === defaultValue) {
      next.delete(key);
    } else {
      next.set(key, value);
    }
    setSearchParams(next, {replace: true});
  };
  const routedController: EventPublishingController = {
    ...controller,
    setFilter: (next) => {
      const value = typeof next === "function" ? next(controller.filter) : next;
      controller.setFilter(value);
      updateSearchParam("filter", value, "launchCities");
    },
    setQuery: (next) => {
      const value = typeof next === "function" ? next(controller.query) : next;
      controller.setQuery(value);
      updateSearchParam("q", value);
    },
    setExternalFilter: (next) => {
      const value = typeof next === "function" ?
        next(controller.externalFilter) :
        next;
      controller.setExternalFilter(value);
      updateSearchParam("filter", value, "public");
    },
    setExternalQuery: (next) => {
      const value = typeof next === "function" ?
        next(controller.externalQuery) :
        next;
      controller.setExternalQuery(value);
      updateSearchParam("q", value);
    },
  };
  return (
    <EventPublishingWorkspace
      activeWorkspace={activeWorkspace}
      controller={routedController}
      onWorkspaceChange={onWorkspaceChange}
    />
  );
}

export function EventPublishingWorkspace({
  activeWorkspace = "directory",
  controller,
  onWorkspaceChange = () => undefined,
}: {
  activeWorkspace?: EventPublishingWorkspaceId;
  controller: EventPublishingController;
  onWorkspaceChange?: (workspace: EventPublishingWorkspaceId) => void;
}) {
  const activeCount = controller.rows.filter((row) =>
    row.status === "active"
  ).length;
  const fullCount = controller.rows.filter(eventIsFull).length;
  const searchIssueCount = controller.rows.filter(eventNeedsSearchBackfill).length;

  return (
    <AdminWorkbenchStack compact>
      <SegmentedControl<EventPublishingWorkspaceId>
        ariaLabel="Event workspaces"
        options={[
          {id: "directory", label: "Directory"},
          {id: "readiness", label: "Readiness"},
          {id: "external", label: "External inventory"},
        ]}
        onChange={onWorkspaceChange}
        value={activeWorkspace}
      />
      {controller.view === "detail" ? (
        <eventPublishingDirectoryPanels.EventDetailView controller={controller} />
      ) : controller.view === "readiness" ? (
        <eventPublishingDirectoryPanels.EventReadinessView controller={controller} />
      ) : controller.view === "external" ? (
        <eventPublishingDirectoryPanels.ExternalEventInventoryView controller={controller} />
      ) : (
        <eventPublishingDirectoryPanels.EventDirectoryView
          activeCount={activeCount}
          controller={controller}
          fullCount={fullCount}
          searchIssueCount={searchIssueCount}
        />
      )}
    </AdminWorkbenchStack>
  );
}

const eventPublishingFilters: readonly EventPublishingFilter[] = [
  "launchCities",
  "upcoming",
  "all",
  "active",
  "cancelled",
  "full",
  "searchIssues",
];

const externalEventSupplyFilters: readonly ExternalEventSupplyFilter[] = [
  "launchCities",
  "upcoming",
  "public",
  "active",
  "cancelled",
];

function isEventPublishingFilter(
  value: string | null
): value is EventPublishingFilter {
  return eventPublishingFilters.some((candidate) => candidate === value);
}

function isExternalEventSupplyFilter(
  value: string | null
): value is ExternalEventSupplyFilter {
  return externalEventSupplyFilters.some((candidate) => candidate === value);
}
