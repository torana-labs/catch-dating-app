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
  AdminOrganizerClaimListRow,
  AdminOrganizerClaimRequestDetails,
  AdminOrganizerDetails,
  AdminOrganizerListRow,
  OrganizerAppVisibility,
  OrganizerEntityKind,
  OrganizerPublishStatus,
  OrganizerSourceConfidence,
  OrganizerVerificationStatus,
  OrganizerClaimDecision,
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
  onSelectOrganizerId,
  onWorkspaceChange,
  selectedClaimRequestId,
  selectedOrganizerId,
}: {
  activeWorkspace?: "directory" | "claims";
  selectedOrganizerId?: string | null;
  onBackToList?: () => void;
  onBackToClaims?: () => void;
  onSelectClaimRequestId?: (requestId: string) => void;
  onSelectOrganizerId?: (organizerId: string) => void;
  onWorkspaceChange?: (workspace: "directory" | "claims") => void;
  selectedClaimRequestId?: string | null;
}) {
  const {setError: onError, setNotice: onNotice} = useAdminFeedback();
  const controller = useOrganizerPublishingController({
    onBackToList,
    onError,
    onNotice,
    onSelectOrganizerId,
    selectedOrganizerId,
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
}: {
  activeWorkspace?: "directory" | "claims";
  claimReviewController?: OrganizerClaimReviewController;
  controller: OrganizerPublishingController;
  onBackToClaims?: () => void;
  onWorkspaceChange?: (workspace: "directory" | "claims") => void;
}) {
  if (activeWorkspace === "claims" && claimReviewController) {
    return (
      <AdminWorkbenchStack compact>
        <organizerDirectoryPanels.OrganizerClaimReviewWorkspace
          controller={claimReviewController}
          onBackToList={onBackToClaims}
        />
      </AdminWorkbenchStack>
    );
  }
  if (controller.view === "detail") {
    return <organizerDetailPanels.OrganizerDetailView controller={controller} />;
  }
  return (
    <AdminWorkbenchStack compact>
      <EmptyState variant="workbench">Open an organizer from Organizers to edit its page.</EmptyState>
    </AdminWorkbenchStack>
  );
}
