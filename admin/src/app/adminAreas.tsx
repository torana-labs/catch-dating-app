import {CatchIndexRow, CatchPaneLayout, CatchWorkspaceHeader, type CatchIconName, type CatchTabBarItem} from "@catch/web-ui";
import {lazy, type ReactNode} from "react";
import type {Location, NavigateFunction} from "react-router";
import type {DataMode} from "../shared/types/adminTypes";
import {
  adminPathForNav,
  marketingPathForTab,
  moneyPath,
  paymentSettingsPath,
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
const MoneyRouteScreen = lazy(() => import("../features/money/ui/MoneyRouteScreen").then((m) => ({default: m.MoneyRouteScreen})));
const PaymentSettingsRouteScreen = lazy(() => import("../features/settings/ui/PaymentSettingsRouteScreen").then((m) => ({default: m.PaymentSettingsRouteScreen})));
const OrganizersRouteScreen = lazy(() => import("../features/organizers/ui/OrganizersRouteScreen").then((m) => ({default: m.OrganizersRouteScreen})));
const EventsRouteScreen = lazy(() => import("../features/events/ui/EventsRouteScreen").then((m) => ({default: m.EventsRouteScreen})));
const OrganizerEventsRouteWorkspace = lazy(() => import("../features/events/ui/EventsRouteScreen").then((m) => ({default: m.OrganizerEventsRouteWorkspace})));
const UserAnalyticsScreen = lazy(() => import("../features/users/ui/UserAnalyticsScreen").then((m) => ({default: m.UserAnalyticsScreen})));
const PeopleRouteScreen = lazy(() => import("../features/people/ui/PeopleRouteScreen").then((m) => ({default: m.PeopleRouteScreen})));
const CrossPathsShowcaseScreen = lazy(() => import("../features/cross-paths/ui/CrossPathsShowcaseScreen").then((m) => ({default: m.CrossPathsShowcaseScreen})));
const DataQualityScreen = lazy(() => import("../features/data-quality/ui/DataQualityScreen").then((m) => ({default: m.DataQualityScreen})));
const SettingsRouteScreen = lazy(() => import("../features/settings/ui/SettingsRouteScreen").then((m) => ({default: m.SettingsRouteScreen})));
const IntakeSettingsRouteScreen = lazy(() => import("../features/intake/organizer/ui/IntakeSettingsRouteScreen").then((m) => ({default: m.IntakeSettingsRouteScreen})));
const SafetySettingsRouteScreen = lazy(() => import("../features/safety/ui/SafetySettingsRouteScreen").then((m) => ({default: m.SafetySettingsRouteScreen})));
const AdminActionExecutionsScreen = lazy(() => import("../features/operations/ui/AdminActionExecutionsScreen").then((m) => ({default: m.AdminActionExecutionsScreen})));
const SupportRouteScreen = lazy(() => import("../features/support/ui/SupportRouteScreen").then((m) => ({default: m.SupportRouteScreen})));
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
    render: ({adminRoles, mode, navigate, route, setError, setNotice}) => (
      <SafetyRouteScreen
        adminRoles={mode === "sample" ? ["adminOwner"] : adminRoles}
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
    label: "Support", icon: "support", frame: "redrawn",
    render: ({mode, navigate, route, session, setError, setNotice, userUid}) => route.supportWorkspace === "trial" ? (
      <CatchWhatsappTrialWorkspace
        scope={{actorUid: userUid ?? "", projectId: session.projectId, sessionKey: session.sessionKey, isCurrent: session.isCurrent}}
      />
    ) : (
      <SupportRouteScreen
        conversationId={route.params.supportConversationId ?? null}
        onError={setError}
        onNavigate={navigate}
        onNotice={setNotice}
        userUid={userUid ?? (mode === "sample" ? "sample-owner" : null)}
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
  money: {
    label: "Money", icon: "payment", frame: "redrawn",
    render: ({navigate, route, setNotice}) => (
      <MoneyRouteScreen
        onNotice={setNotice}
        onOpen={(view, id) => navigate(moneyPath(view, id))}
        onOpenSettings={() => navigate(paymentSettingsPath())}
        selectedId={route.params.billId ?? route.params.moneyIssueId ?? null}
        view={route.moneyView}
      />
    ),
  },

  organizers: {
    label: "Organizers", icon: "organizer", frame: "redrawn",
    render: ({navigate, route}) => (
      <OrganizersRouteScreen
        claimRequestId={route.params.claimRequestId ?? null}
        onNavigate={navigate}
        organizerId={route.params.organizerId ?? null}
        renderEvents={(organizerId) => <OrganizerEventsRouteWorkspace onNavigate={navigate} organizerId={organizerId} />}
        tab={route.organizerTab}
        workspace={route.organizerWorkspace}
      />
    ),
  },
  events: {
    label: "Events", icon: "event", frame: "redrawn",
    render: ({navigate, route}) => (
      <EventsRouteScreen
        eventId={route.params.eventId ?? null}
        externalEventId={route.params.externalEventId ?? null}
        onNavigate={navigate}
        tab={route.eventTab}
        workspace={route.eventWorkspace}
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
    label: "User analytics", icon: "insights", frame: "legacy",
    render: ({setError, setNotice}) => (
      <UserAnalyticsScreen handoffRequestId={null} handoffUserId={null} onError={setError} onNotice={setNotice} />
    ),
  },
  people: {
    label: "People", icon: "people", frame: "redrawn",
    render: ({navigate}) => <PeopleRouteScreen onOpenSafety={() => navigate("/safety/actions")} />,
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
  settings: {
    label: "Settings", icon: "settings", frame: "redrawn",
    render: ({adminRoles: claims, canOpen, mode, navigate, route, setError, setNotice, userUid}) => {
      // Sample data signs in as the sample owner, who holds no claims.
      const adminRoles = mode === "sample" ? ["adminOwner"] : claims;
      return (
      <SettingsRouteScreen
        canManageTeam={adminRoles.includes("adminOwner")}
        currentUserUid={userUid ?? (mode === "sample" ? "sample-owner" : null)}
        onError={setError}
        onNavigate={navigate}
        onNotice={setNotice}
        otherPages={[
          ...(canOpen("organizer-intake") ? [{
            id: "intake", title: "Intake", subtitle: "Nominations, what runs on its own, launch cities",
            render: () => <IntakeSettingsRouteScreen onError={setError} onNotice={setNotice} />,
          }] : []),
          ...(adminRoles.includes("adminOwner") ? [{
            id: "payments", title: "Payments", subtitle: "Terms, partner credit, GST",
            render: () => (
              <PaymentSettingsRouteScreen
                actorUid={userUid ?? (mode === "sample" ? "sample-owner" : "")}
                canManage
                edit={route.paymentsEdit}
                onBackToSettings={() => navigate(adminPathForNav("settings"))}
                onError={setError}
                onNotice={setNotice}
                onOpen={(edit, organizerId) => navigate(paymentSettingsPath(edit ?? null, organizerId ?? null))}
                termsOrganizerId={route.params.termsOrganizerId ?? null}
              />
            ),
          }] : []),
          ...(canOpen("safety") ? [{
            id: "safety", title: "Safety", subtitle: "Account actions, deadlines, grievance contact",
            render: () => <SafetySettingsRouteScreen adminRoles={adminRoles} onError={setError} onNotice={setNotice} />,
          }] : []),
        ]}
        selectedPage={route.params.teamMemberUid ? "team" : route.settingsPage ?? route.params.settingsPage ?? null}
        teamMemberUid={route.params.teamMemberUid ?? null}
      />
      );
    },
  },
};

/** The older payment setup screens, until Settings → Payments replaces them. */
/** Opens a Needs you item in the area that owns it, at the record when the area has a record route. */
function openQueueItem(
  context: AdminAreaContext,
  destination: "safety" | "organizers" | "money",
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
  } else if (targetPath && destination === "money") {
    // Needs you names a payment by its document path; Money names an issue "collection:id".
    navigate(moneyPath("issues", targetPath.replace("/", ":")));
  } else {
    navigate(adminPathForNav(destination));
  }
}
