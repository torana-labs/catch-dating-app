import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Database,
  ExternalLink,
  FileWarning,
  FolderSearch,
  RefreshCw,
  Save,
  Search,
  Smartphone,
  Settings2,
  UploadCloud,
  UserCheck,
  Users,
} from "lucide-react";
import type {
  AdminClubClaimListRow,
  AdminClubClaimRequestDetails,
  AdminClubDetails,
  AdminClubListRow,
  OrganizerAppVisibility,
  OrganizerEntityKind,
  OrganizerPublishStatus,
  OrganizerSourceConfidence,
  OrganizerVerificationStatus,
  ClubClaimDecision,
} from "../../../shared/types/adminTypes";
import {
  AdminButton,
  AdminChecklistStack,
  AdminDetailScreenStack,
  AdminDiffList,
  AdminDirectoryScreenStack,
  AdminDiffRow,
  AdminEditorGrid,
  AdminEditorPanel,
  AdminEditorSection,
  AdminFieldGrid,
  AdminForm,
  AdminLinkButton,
  AdminMetricCard,
  AdminMetricGrid,
  AdminMutedCell,
  AdminPublishingLoadbar,
  AdminRoadmapList,
  AdminRoadmapListItem,
  AdminStatusGrid,
  AdminSurfacePreview,
  AdminTableRow,
  AdminToolbar,
  AdminWorkbenchStack,
  CheckboxField,
  DataTable,
  EmptyState,
  PageHeader,
  Panel,
  QualityList,
  SearchField,
  SegmentedControl,
  StateRow,
  TableActionButton,
  AdminRowTitle,
  AdminTagRow,
} from "../../../shared/ui/AdminPrimitives";
import {
  countBlockingIssues,
  countDiffRows,
  organizerNeedsPublish,
  type OrganizerPublishingController,
  type OrganizerPublishingFilter,
  useOrganizerPublishingController,
} from "../controllers/useOrganizerPublishingController";
import {
  type OrganizerClaimReviewController,
  useOrganizerClaimReviewController,
} from "../controllers/useOrganizerClaimReviewController";
import type {
  OrganizerDiffRow,
  OrganizerPublishingFormState,
  OrganizerValidationIssue,
  PublishChecklistState,
} from "../controllers/organizerPublishingHelpers";
import {useAdminFeedback} from "../../../shared/feedback/AdminFeedbackContext";
import {organizerDirectoryPanels} from "./organizerDirectoryPanels";
import {organizerDetailPanels} from "./organizerDetailPanels";
import {brand} from "@catch/brand";

// Panels from sibling modules stay feature-private.


const defaultPublicSiteOrigin = brand.web.origin;
const publicSiteOrigin = String(
  import.meta.env.VITE_ADMIN_PUBLIC_SITE_ORIGIN ?? defaultPublicSiteOrigin
).replace(/\/+$/u, "");

export function OrganizerPublishingScreen({
  activeWorkspace = "directory",
  onBackToList,
  onBackToClaims,
  onSelectClaimRequestId,
  onSelectClubId,
  onWorkspaceChange,
  selectedClaimRequestId,
  selectedClubId,
}: {
  activeWorkspace?: "directory" | "claims";
  selectedClubId?: string | null;
  onBackToList?: () => void;
  onBackToClaims?: () => void;
  onSelectClaimRequestId?: (requestId: string) => void;
  onSelectClubId?: (clubId: string) => void;
  onWorkspaceChange?: (workspace: "directory" | "claims") => void;
  selectedClaimRequestId?: string | null;
}) {
  const {setError: onError, setNotice: onNotice} = useAdminFeedback();
  const controller = useOrganizerPublishingController({
    onBackToList,
    onError,
    onNotice,
    onSelectClubId,
    selectedClubId,
  });
  const claimReviewController = useOrganizerClaimReviewController({
    enabled: activeWorkspace === "claims",
    onError,
    onNotice,
    onSelectedRequestIdChange: (requestId) => {
      if (requestId) {
        onSelectClaimRequestId?.(requestId);
      } else {
        onBackToClaims?.();
      }
    },
    selectedRequestId: selectedClaimRequestId,
  });
  return (
    <OrganizerPublishingWorkspace
      activeWorkspace={activeWorkspace}
      claimReviewController={claimReviewController}
      controller={controller}
      onBackToClaims={onBackToClaims}
      onWorkspaceChange={onWorkspaceChange}
    />
  );
}
export function OrganizerPublishingWorkspace({
  activeWorkspace = "directory",
  claimReviewController,
  controller,
  onBackToClaims = () => undefined,
  onWorkspaceChange = () => undefined,
}: {
  activeWorkspace?: "directory" | "claims";
  claimReviewController?: OrganizerClaimReviewController;
  controller: OrganizerPublishingController;
  onBackToClaims?: () => void;
  onWorkspaceChange?: (workspace: "directory" | "claims") => void;
}) {
  const needsPublishCount = controller.rows.filter(organizerNeedsPublish).length;
  const publishedCount = controller.rows.filter((row) =>
    row.publishStatus === "published"
  ).length;
  const readinessIssueCount = controller.rows.filter((row) =>
    row.routeStatus !== "valid" ||
    row.routeReservationStatus !== "reserved" ||
    row.searchIndexStatus !== "indexed"
  ).length;

  if (controller.view === "detail") {
    return <organizerDetailPanels.OrganizerDetailView controller={controller} />;
  }

  return (
    <AdminWorkbenchStack compact>
      <SegmentedControl<"directory" | "claims">
        ariaLabel="Organizer workspaces"
        options={[
          {id: "directory", label: "Directory"},
          {id: "claims", label: "Claims"},
        ]}
        onChange={onWorkspaceChange}
        value={activeWorkspace}
      />
      {activeWorkspace === "claims" && claimReviewController ? (
        <organizerDirectoryPanels.OrganizerClaimReviewWorkspace
          controller={claimReviewController}
          onBackToList={onBackToClaims}
        />
      ) : (
        <organizerDirectoryPanels.OrganizerDirectoryView
          controller={controller}
          needsPublishCount={needsPublishCount}
          publishedCount={publishedCount}
          readinessIssueCount={readinessIssueCount}
        />
      )}
    </AdminWorkbenchStack>
  );
}
