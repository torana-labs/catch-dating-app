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
import type {
  OrganizerDiffRow,
  OrganizerPublishingFormState,
  OrganizerValidationIssue,
  PublishChecklistState,
} from "../controllers/organizerPublishingHelpers";
import {useAdminFeedback} from "../../../shared/feedback/AdminFeedbackContext";
import {organizerDetailPanels} from "./organizerDetailPanels";
import {brand} from "@catch/brand";

// Panels from sibling modules stay feature-private.


const defaultPublicSiteOrigin = brand.web.origin;
const publicSiteOrigin = String(
  import.meta.env.VITE_ADMIN_PUBLIC_SITE_ORIGIN ?? defaultPublicSiteOrigin
).replace(/\/+$/u, "");

export function OrganizerPublishingScreen({
  onBackToList,
  onSelectOrganizerId,
  selectedOrganizerId,
}: {
  selectedOrganizerId?: string | null;
  onBackToList?: () => void;
  onSelectOrganizerId?: (organizerId: string) => void;
}) {
  const {setError: onError, setNotice: onNotice} = useAdminFeedback();
  const controller = useOrganizerPublishingController({
    onBackToList,
    onError,
    onNotice,
    onSelectOrganizerId,
    selectedOrganizerId,
  });
  return <OrganizerPublishingWorkspace controller={controller} />;
}
export function OrganizerPublishingWorkspace({controller}: {controller: OrganizerPublishingController}) {
  if (controller.view === "detail") {
    return <organizerDetailPanels.OrganizerDetailView controller={controller} />;
  }
  return (
    <AdminWorkbenchStack compact>
      <EmptyState variant="workbench">Open an organizer from Organizers to edit its page.</EmptyState>
    </AdminWorkbenchStack>
  );
}
