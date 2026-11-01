import {CatchIndexRow, CatchPaneLayout, CatchWorkspaceHeader, type CatchIconName, type CatchTabBarItem} from "@catch/web-ui";
import {lazy, type ReactNode} from "react";
import type {Location, NavigateFunction} from "react-router";
import type {DataMode} from "../shared/types/adminTypes";
import {
  adminPathForNav,
  commercialTermsPathForOrganizer,
  marketingPathForTab,
  resolveAdminRoute,
  type AdminNavId,
} from "./adminRoutes";

const NowRouteScreen = lazy(() => import("../features/now/ui/NowRouteScreen").then((m) => ({default: m.NowRouteScreen})));
const MarketplaceRouteScreen = lazy(() => import("../features/marketplace/ui/MarketplaceRouteScreen").then((m) => ({default: m.MarketplaceRouteScreen})));
const MarketingOpsScreen = lazy(() => import("../features/marketing/ui/MarketingOpsScreen").then((m) => ({default: m.MarketingOpsScreen})));
const InboxRouteScreen = lazy(() => import("../features/inbox/ui/InboxRouteScreen").then((m) => ({default: m.InboxRouteScreen})));
const IntakeWorkspaceScreen = lazy(() => import("../features/intake/ui/IntakeWorkspaceScreen").then((m) => ({default: m.IntakeWorkspaceScreen})));
const SafetyRouteScreen = lazy(() => import("../features/safety/ui/SafetyRouteScreen").then((m) => ({default: m.SafetyRouteScreen})));
const GrowthKpiScreen = lazy(() => import("../features/growth/ui/GrowthKpiScreen").then((m) => ({default: m.GrowthKpiScreen})));
const FinanceOpsScreen = lazy(() => import("../features/finance/ui/FinanceOpsScreen").then((m) => ({default: m.FinanceOpsScreen})));
const CommercialTermsScreen = lazy(() => import("../features/commercial-terms/ui/CommercialTermsScreen").then((m) => ({default: m.CommercialTermsScreen})));
const PaymentRoutingScreen = lazy(() => import("../features/payment-routing/ui/PaymentRoutingScreen").then((m) => ({default: m.PaymentRoutingScreen})));
const OrganizerPublishingScreen = lazy(() => import("../features/organizers/ui/OrganizerPublishingScreen").then((m) => ({default: m.OrganizerPublishingScreen})));
const EventPublishingScreen = lazy(() => import("../features/events/ui/EventPublishingScreen").then((m) => ({default: m.EventPublishingScreen})));
const UserAnalyticsScreen = lazy(() => import("../features/users/ui/UserAnalyticsScreen").then((m) => ({default: m.UserAnalyticsScreen})));
const CrossPathsShowcaseScreen = lazy(() => import("../features/cross-paths/ui/CrossPathsShowcaseScreen").then((m) => ({default: m.CrossPathsShowcaseScreen})));
const DataQualityScreen = lazy(() => import("../features/data-quality/ui/DataQualityScreen").then((m) => ({default: m.DataQualityScreen})));
const AdminRoleManagementScreen = lazy(() => import("../features/admin-roles/ui/AdminRoleManagementScreen").then((m) => ({default: m.AdminRoleManagementScreen})));
const AdminActionExecutionsScreen = lazy(() => import("../features/operations/ui/AdminActionExecutionsScreen").then((m) => ({default: m.AdminActionExecutionsScreen})));
const CatchWhatsappTrialWorkspace = lazy(() => import("../features/catch-support/ui/CatchWhatsappTrialWorkspace").then((m) => ({default: m.CatchWhatsappTrialWorkspace})));
const SalesWorkspaceScreen = lazy(() => import("../features/sales/ui/SalesWorkspaceScreen").then((m) => ({default: m.SalesWorkspaceScreen})));

/** What the shell hands every area's screen. */
export interface AdminAreaContext {
  route: ReturnType<typeof resolveAdminRoute>;
  location: Location;
  navigate: NavigateFunction;
  mode: DataMode;
  adminRoles: string[];
  userUid: string | null;
  isSessionReady: boolean;
  session: {sessionKey: string; isCurrent: () => boolean; projectId: string};
  canOpen: (nav: AdminNavId) => boolean;
  /** This person's navigation, for the phone's More page. */
  navigation: CatchTabBarItem[];
  canManageCommercialTerms: boolean;
  financeWorkspaceSwitch: ReactNode;
  setError: (message: string | null) => void;
  setNotice: (message: string | null) => void;
  setMarketingDirty: (dirty: boolean) => void;
}

export interface AdminArea {
  label: string;
  icon: CatchIconName;
  /**
   * redrawn: the screen draws its own headers in the quiet register. legacy: a screen not yet
   * redrawn keeps the old workspace frame under a plain header; legacy-fill also fills the height.
   */
  frame: "redrawn" | "legacy" | "legacy-fill";
  render: (context: AdminAreaContext) => ReactNode;
}

/** Every Admin area: its navigation label and icon, its frame and its screen. Roles are in adminAccess.ts. */
export const adminAreas: Record<AdminNavId, AdminArea> = {
  now: {
    label: "Needs you", icon: "home", frame: "redrawn",
    render: (context) => (
      <NowRouteScreen
        canOpen={context.canOpen}
        isSessionReady={context.isSessionReady}
        mode={context.mode}
        onOpen={(destination, targetPath) => openQueueItem(context, destination, targetPath ?? null)}
      />
    ),
  },
  more: {
    label: "More", icon: "more", frame: "redrawn",
    render: ({navigate, navigation}) => (
      <>
        <CatchWorkspaceHeader title="More" />
        <CatchPaneLayout
          main={navigation.filter((item) => item.value !== "more").map((item) => (
            <CatchIndexRow
              href={item.href}
              key={item.value}
              onTap={() => navigate(item.href ?? "/")}
              subtitle={item.section}
              title={item.label}
            />
          ))}
          pattern="reading"
        />
      </>
    ),
  },
  "organizer-intake": {
    label: "Inbox", icon: "review", frame: "redrawn",
    render: ({navigate, route, setError, setNotice, userUid, mode}) => (
      <InboxRouteScreen
        onError={setError}
        onNotice={setNotice}
        onOpenReview={() => navigate(adminPathForNav("intake-review"))}
        onSelect={(itemId) => navigate(itemId ? `${adminPathForNav("organizer-intake")}/${encodeURIComponent(itemId)}` :
          adminPathForNav("organizer-intake"))}
        reviewHref={adminPathForNav("intake-review")}
        selectedItemId={route.params.inboxItemId ?? null}
        uid={userUid ?? (mode === "sample" ? "sample-owner" : null)}
      />
    ),
  },
  "intake-review": {
    label: "Intake review", icon: "review", frame: "legacy-fill",
    render: () => <IntakeWorkspaceScreen />,
  },
  safety: {
    label: "Safety", icon: "safety", frame: "redrawn",
    render: ({adminRoles, navigate, route, setError, setNotice}) => (
      <SafetyRouteScreen
        adminRoles={adminRoles}
        onError={setError}
        onNavigate={navigate}
        onNotice={setNotice}
        selectedActionId={route.params.safetyActionId ?? null}
        selectedTargetPath={route.params.targetPath ?? null}
        view={route.safetyView}
      />
    ),
  },
  support: {
    label: "Support", icon: "support", frame: "legacy",
    render: ({session, userUid}) => (
      <CatchWhatsappTrialWorkspace
        scope={{actorUid: userUid ?? "", projectId: session.projectId, sessionKey: session.sessionKey, isCurrent: session.isCurrent}}
      />
    ),
  },
  sales: {
    label: "Sales", icon: "partner", frame: "legacy",
    render: ({adminRoles, mode, navigate, route, userUid}) => (
      <SalesWorkspaceScreen
        area={route.salesArea}
        assignedStaffOnly={adminRoles.includes("salesStaff") && !adminRoles.some((role) => role === "admin" || role === "adminOwner")}
        currentUserUid={userUid ?? (mode === "sample" ? "sample-owner" : "")}
        isAdminOwner={adminRoles.includes("adminOwner")}
        onAreaChange={(area) => navigate(`/sales/${area}`)}
        onBackToHosts={() => navigate("/sales/hosts")}
        onOpenHost={(organizerId) => navigate(`/sales/hosts/${encodeURIComponent(organizerId)}`)}
        onOpenIntake={() => navigate("/intake/organizers")}
        onOpenOrganizer={(organizerId) => navigate(`/organizers/${encodeURIComponent(organizerId)}`)}
        selectedOrganizerId={route.params.salesOrganizerId ?? null}
      />
    ),
  },
  finance: {
    label: "Money", icon: "payment", frame: "legacy",
    render: (context) => renderMoney(context),
  },
  organizers: {
    label: "Organizers", icon: "organizer", frame: "legacy",
    render: ({navigate, route}) => (
      <OrganizerPublishingScreen
        activeWorkspace={route.organizerWorkspace}
        onBackToClaims={() => navigate(`${adminPathForNav("organizers")}/claims`)}
        onBackToList={() => navigate(adminPathForNav("organizers"))}
        onSelectClaimRequestId={(requestId) => navigate(`${adminPathForNav("organizers")}/claims/${encodeURIComponent(requestId)}`)}
        onSelectOrganizerId={(organizerId) => navigate(`${adminPathForNav("organizers")}/${encodeURIComponent(organizerId)}`)}
        onWorkspaceChange={(workspace) => navigate(workspace === "claims" ? `${adminPathForNav("organizers")}/claims` : adminPathForNav("organizers"))}
        selectedClaimRequestId={route.params.claimRequestId ?? null}
        selectedOrganizerId={route.params.organizerId ?? null}
      />
    ),
  },
  events: {
    label: "Events", icon: "event", frame: "legacy",
    render: ({location, navigate, route}) => (
      <EventPublishingScreen
        activeWorkspace={route.eventWorkspace}
        onBackToList={() => navigate(`${adminPathForNav("events")}${location.search}`)}
        onSelectEventId={(eventId) => navigate(`${adminPathForNav("events")}/${encodeURIComponent(eventId)}${location.search}`)}
        onSelectExternalEventId={(eventId) => navigate(eventId ?
          `${adminPathForNav("events")}/external/${encodeURIComponent(eventId)}${location.search}` :
          `${adminPathForNav("events")}/external${location.search}`)}
        onWorkspaceChange={(workspace) => navigate(workspace === "directory" ? adminPathForNav("events") : `${adminPathForNav("events")}/${workspace}`)}
        selectedEventId={route.params.eventId ?? null}
        selectedExternalEventId={route.params.externalEventId ?? null}
      />
    ),
  },
  growth: {
    label: "Growth", icon: "trend", frame: "legacy",
    render: ({navigate, route, setError}) => (
      <GrowthKpiScreen
        onBackToList={() => navigate(adminPathForNav("growth"))}
        onError={setError}
        onSelectSignalId={(signalId) => navigate(`/growth/signals/${encodeURIComponent(signalId)}`)}
        selectedSignalId={route.params.growthSignalId ?? null}
      />
    ),
  },
  marketplace: {
    label: "Marketplace", icon: "insights", frame: "legacy",
    render: ({adminRoles, isSessionReady, mode, setError, setNotice}) => (
      <MarketplaceRouteScreen adminRoles={adminRoles} isSessionReady={isSessionReady} mode={mode} onError={setError} onNotice={setNotice} />
    ),
  },
  users: {
    label: "Users", icon: "people", frame: "legacy",
    render: ({setError, setNotice}) => (
      <UserAnalyticsScreen handoffRequestId={null} handoffUserId={null} onError={setError} onNotice={setNotice} />
    ),
  },
  "cross-paths": {
    label: "Cross Paths", icon: "like", frame: "legacy",
    render: ({adminRoles, mode, setError, setNotice}) => (
      <CrossPathsShowcaseScreen
        canDecide={mode === "sample" || ["admin", "adminOwner", "safetyReviewer"].some((role) => adminRoles.includes(role))}
        onError={setError}
        onNotice={setNotice}
      />
    ),
  },
  "marketing-ops": {
    label: "Marketing", icon: "announce", frame: "legacy",
    render: ({navigate, route, setError, setMarketingDirty, setNotice}) => (
      <MarketingOpsScreen
        activeTab={route.marketingTab}
        composerStep={route.composerStep}
        onComposerStepChange={(step) => {
          const draftId = route.params.draftId ?? null;
          if (draftId) navigate(`/marketing/drafts/${encodeURIComponent(draftId)}/${step}`);
        }}
        onDraftOpen={(draftId, step) => navigate(`/marketing/drafts/${encodeURIComponent(draftId)}/${step}`)}
        onError={setError}
        onNotice={setNotice}
        onTabChange={(tab) => navigate(marketingPathForTab(tab))}
        onUnsavedChangesChange={setMarketingDirty}
        selectedDraftId={route.params.draftId ?? null}
      />
    ),
  },
  quality: {
    label: "Data quality", icon: "data", frame: "legacy",
    render: ({navigate, route, setError}) => (
      <DataQualityScreen
        onBackToList={() => navigate(adminPathForNav("quality"))}
        onError={setError}
        onOpenOwningWorkflow={(path) => navigate(path)}
        onSelectSignalId={(signalId) => navigate(`/quality/signals/${encodeURIComponent(signalId)}`)}
        selectedSignalId={route.params.qualitySignalId ?? null}
      />
    ),
  },
  operations: {
    label: "Agent activity", icon: "bot", frame: "legacy",
    render: ({setError}) => <AdminActionExecutionsScreen onError={setError} />,
  },
  "admin-roles": {
    label: "Admin roles", icon: "admin", frame: "legacy",
    render: ({navigate, route, setError, setNotice, userUid}) => (
      <AdminRoleManagementScreen
        currentUserUid={userUid}
        onBackToRegister={() => navigate(adminPathForNav("admin-roles"))}
        onError={setError}
        onNotice={setNotice}
        onSelectTargetUid={(targetUid) => navigate(`/admin-roles/${encodeURIComponent(targetUid)}`)}
        selectedTargetUid={route.params.adminRoleTargetUid ?? null}
      />
    ),
  },
};

/**
 * Each job's navigation, in the order of the redesign's NAV table (catch-design-source
 * gen/admin_common.py). Areas still to be redrawn follow under "Older pages" until their
 * replacements land; each area's PR moves or removes its line here.
 */
function renderMoney(context: AdminAreaContext) {
  const {canManageCommercialTerms, financeWorkspaceSwitch, navigate, route, setError, setNotice, userUid, adminRoles} = context;
  if (route.financeWorkspace === "commercial-terms") {
    return (
      <CommercialTermsScreen
        canManage={canManageCommercialTerms}
        key={userUid ?? "sample"}
        onError={setError}
        onNotice={setNotice}
        onOpenOrganizer={(organizerId) => navigate(commercialTermsPathForOrganizer(organizerId))}
        onOpenPlatform={() => navigate(commercialTermsPathForOrganizer(null))}
        organizerId={route.params.termsOrganizerId ?? null}
        workspaceSwitch={financeWorkspaceSwitch}
      />
    );
  }
  if (route.financeWorkspace === "payment-routing") {
    return (
      <PaymentRoutingScreen
        canManage={canManageCommercialTerms}
        key={userUid ?? "sample"}
        onError={setError}
        onNotice={setNotice}
        workspaceSwitch={financeWorkspaceSwitch}
      />
    );
  }
  return (
    <FinanceOpsScreen
      actorUid={userUid ?? "sample"}
      adminRoles={adminRoles}
      key={userUid ?? "sample"}
      onBackToList={() => navigate(adminPathForNav("finance"))}
      onError={setError}
      onNotice={setNotice}
      onSelectIssueId={(issueId) => navigate(`/finance/issues/${encodeURIComponent(issueId)}`)}
      selectedIssueId={route.params.financeIssueId ?? null}
      workspaceSwitch={financeWorkspaceSwitch}
    />
  );
}

/** Opens a Needs you item in the area that owns it, at the record when the area has a record route. */
function openQueueItem(
  context: AdminAreaContext,
  destination: "safety" | "organizers" | "finance",
  targetPath: string | null
) {
  const {navigate, setError, setNotice} = context;
  if (!context.canOpen(destination)) {
    setNotice(null);
    setError(`Your admin role cannot open ${adminAreas[destination].label}.`);
    return;
  }
  setError(null);
  setNotice(null);
  const targetId = targetPath?.split("/").filter(Boolean).at(-1) ?? null;
  if (targetPath && destination === "safety") {
    navigate(`/safety/${encodeURIComponent(targetPath)}`);
  } else if (targetId && destination === "organizers") {
    navigate(targetPath?.startsWith("organizerClaimRequests/") ?
      `/organizers/claims/${encodeURIComponent(targetId)}` :
      `/organizers/${encodeURIComponent(targetId)}`);
  } else if (targetPath && destination === "finance") {
    navigate(`/finance/issues/${encodeURIComponent(targetPath)}`);
  } else {
    navigate(adminPathForNav(destination));
  }
}
