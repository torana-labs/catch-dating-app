import {CatchIndexRow, CatchPaneLayout, CatchWorkspaceHeader, type CatchIconName, type CatchTabBarItem} from "@catch/web-ui";
import {lazy, type ReactNode} from "react";
import type {Location, NavigateFunction} from "react-router";
import type {DataMode} from "../shared/types/adminTypes";
import {
  adminPathForNav,
  commercialTermsPathForOrganizer,
  marketingPathForTab,
  moneyPath,
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
const OrganizerBillsRouteWorkspace = lazy(() => import("../features/money/ui/OrganizerBillsWorkspace").then((m) => ({default: m.OrganizerBillsRouteWorkspace})));
const FinanceOpsScreen = lazy(() => import("../features/finance/ui/FinanceOpsScreen").then((m) => ({default: m.FinanceOpsScreen})));
const CommercialTermsScreen = lazy(() => import("../features/commercial-terms/ui/CommercialTermsScreen").then((m) => ({default: m.CommercialTermsScreen})));
const PaymentRoutingScreen = lazy(() => import("../features/payment-routing/ui/PaymentRoutingScreen").then((m) => ({default: m.PaymentRoutingScreen})));
const OrganizersRouteScreen = lazy(() => import("../features/organizers/ui/OrganizersRouteScreen").then((m) => ({default: m.OrganizersRouteScreen})));
const EventsRouteScreen = lazy(() => import("../features/events/ui/EventsRouteScreen").then((m) => ({default: m.EventsRouteScreen})));
const OrganizerEventsRouteWorkspace = lazy(() => import("../features/events/ui/EventsRouteScreen").then((m) => ({default: m.OrganizerEventsRouteWorkspace})));
const UserAnalyticsScreen = lazy(() => import("../features/users/ui/UserAnalyticsScreen").then((m) => ({default: m.UserAnalyticsScreen})));
const PeopleRouteScreen = lazy(() => import("../features/people/ui/PeopleRouteScreen").then((m) => ({default: m.PeopleRouteScreen})));
const SystemRouteScreen = lazy(() => import("../features/system/ui/SystemRouteScreen").then((m) => ({default: m.SystemRouteScreen})));
const DataQualityScreen = lazy(() => import("../features/data-quality/ui/DataQualityScreen").then((m) => ({default: m.DataQualityScreen})));
const SettingsRouteScreen = lazy(() => import("../features/settings/ui/SettingsRouteScreen").then((m) => ({default: m.SettingsRouteScreen})));
const IntakeSettingsRouteScreen = lazy(() => import("../features/intake/organizer/ui/IntakeSettingsRouteScreen").then((m) => ({default: m.IntakeSettingsRouteScreen})));
const SafetySettingsRouteScreen = lazy(() => import("../features/safety/ui/SafetySettingsRouteScreen").then((m) => ({default: m.SafetySettingsRouteScreen})));
const AdminActionExecutionsScreen = lazy(() => import("../features/operations/ui/AdminActionExecutionsScreen").then((m) => ({default: m.AdminActionExecutionsScreen})));
const SupportRouteScreen = lazy(() => import("../features/support/ui/SupportRouteScreen").then((m) => ({default: m.SupportRouteScreen})));
const CatchWhatsappTrialWorkspace = lazy(() => import("../features/catch-support/ui/CatchWhatsappTrialWorkspace").then((m) => ({default: m.CatchWhatsappTrialWorkspace})));
const SalesRouteScreen = lazy(() => import("../features/sales/ui/SalesRouteScreen").then((m) => ({default: m.SalesRouteScreen})));
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
    label: "Sales", icon: "partner", frame: "redrawn",
    render: (context) => context.route.salesArea === "today" ? renderSales(context, "today") : renderOlderSales(context),
  },
  "sales-hosts": {
    label: "Hosts", icon: "business", frame: "redrawn",
    render: (context) => renderSales(context, "hosts"),
  },
  "sales-deals": {
    label: "Deals", icon: "partner", frame: "redrawn",
    render: (context) => renderSales(context, "deals"),
  },
  nominations: {
    label: "My nominations", icon: "review", frame: "redrawn",
    render: (context) => renderSales(context, "nominations"),
  },
  money: {
    label: "Money", icon: "payment", frame: "redrawn",
    render: ({navigate, route, setNotice}) => (
      <MoneyRouteScreen
        onNotice={setNotice}
        onOpen={(view, id) => navigate(moneyPath(view, id))}
        onOpenSettings={() => navigate(commercialTermsPathForOrganizer(null))}
        selectedId={route.params.billId ?? route.params.moneyIssueId ?? null}
        view={route.moneyView}
      />
    ),
  },
  "payment-setup": {
    label: "Payment setup", icon: "settings", frame: "legacy",
    render: (context) => renderPaymentSetup(context),
  },
  organizers: {
    label: "Organizers", icon: "organizer", frame: "redrawn",
    render: ({canOpen, navigate, route}) => (
      <OrganizersRouteScreen
        canChangeTerms={canOpen("payment-setup")}
        claimRequestId={route.params.claimRequestId ?? null}
        onNavigate={navigate}
        organizerId={route.params.organizerId ?? null}
        renderBills={canOpen("money") ? (organizerId) => (
          <OrganizerBillsRouteWorkspace
            onOpenBill={(billId) => navigate(moneyPath("bills", billId))}
            organizerId={organizerId}
          />
        ) : null}
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
  system: {
    label: "System", icon: "data", frame: "redrawn",
    render: ({isSessionReady, mode}) => <SystemRouteScreen isSessionReady={isSessionReady} mode={mode} />,
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
          ...(canOpen("safety") ? [{
            id: "safety", title: "Safety", subtitle: "Account actions, deadlines, grievance contact",
            render: () => <SafetySettingsRouteScreen adminRoles={adminRoles} onError={setError} onNotice={setNotice} />,
          }] : []),
        ]}
        selectedPage={route.params.teamMemberUid ? "team" : route.params.settingsPage ?? null}
        teamMemberUid={route.params.teamMemberUid ?? null}
      />
      );
    },
  },
};

/** The older payment setup screens, until Settings → Payments replaces them. */
function renderPaymentSetup(context: AdminAreaContext) {
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
      onBackToList={() => navigate(adminPathForNav("payment-setup"))}
      onError={setError}
      onNotice={setNotice}
      onSelectIssueId={(issueId) => navigate(`/payment-setup/issues/${encodeURIComponent(issueId)}`)}
      selectedIssueId={route.params.financeIssueId ?? null}
      workspaceSwitch={financeWorkspaceSwitch}
    />
  );
}

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

const salesAreaPaths = {today: "sales", hosts: "sales-hosts", deals: "sales-deals", nominations: "nominations"} as const;

/** One Sales area. A sales associate sees their own work; anyone else sees the team's. */
function renderSales(context: AdminAreaContext, area: keyof typeof salesAreaPaths) {
  const {adminRoles, mode, navigate, route, setError, setNotice, userUid} = context;
  const base = adminPathForNav(salesAreaPaths[area]);
  const selectedId = (area === "today" ? route.params.salesTaskId : area === "hosts" ? route.params.salesOrganizerId :
    area === "nominations" ? route.params.nominationItemId : undefined) ?? null;
  return (
    <SalesRouteScreen
      area={area}
      onError={setError}
      onAddHost={() => navigate("/sales/add-host")}
      onNotice={setNotice}
      onOpenHost={(organizerId) => navigate(`${adminPathForNav("sales-hosts")}/${encodeURIComponent(organizerId)}`)}
      onOpenHostTools={(organizerId) => navigate(`${adminPathForNav("sales-hosts")}/${encodeURIComponent(organizerId)}/tools`)}
      onOpenOrganizer={(organizerId) => navigate(`${adminPathForNav("organizers")}/${encodeURIComponent(organizerId)}`)}
      onSelect={(id) => navigate(id ? `${base}/${encodeURIComponent(id)}` : base)}
      ownWorkOnly={adminRoles.includes("salesStaff") && !adminRoles.some((role) => role === "admin" || role === "adminOwner")}
      selectedId={selectedId}
      uid={userUid ?? (mode === "sample" ? "sample-owner" : null)}
    />
  );
}

/**
 * The older Sales pages: settings (custom fields, imports, history), one host's full tools, adding
 * and nominating, and pipeline, pilots and research, for what the new screens can't do yet. Each
 * goes when its replacement lands.
 */
function renderOlderSales({adminRoles, mode, navigate, route, userUid}: AdminAreaContext) {
  return (
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
  );
}
