import {CatchText, CatchField} from "@catch/web-ui";
import {
  lazy,
  Suspense,
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  createBrowserRouter,
  RouterProvider,
  useBlocker,
  useLocation,
  useNavigate,
} from "react-router";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bot,
  CheckCircle2,
  CircleDollarSign,
  Database,
  FolderSearch,
  HeartHandshake,
  LineChart,
  Lock,
  Megaphone,
  ShieldAlert,
  Sparkles,
  UserCheck,
  Users,
} from "lucide-react";
import {
  AdminAccountMenu,
  AdminAppShell,
  AdminBrandBlock,
  AdminBrandCopy,
  AdminBrandMark,
  AdminBrandTitle,
  AdminButton,
  AdminEnvironmentStatus,
  AdminFeatureLoadingState,
  AdminForm,
  AdminLoadingIcon,
  AdminNavButton,
  AdminNavGroup,
  AdminNavList,
  AdminSidebar,
  AdminSidebarToggle,
  AdminSignInActions,
  AdminSignInMeta,
  AdminSignInPanel,
  AdminSignInScreen,
  AdminTopbar,
  AdminTopbarActions,
  AdminWorkspace,
  StatusBanner,
} from "../shared/ui/AdminPrimitives";
import {
  confirmPhoneSignInCode,
  requestPhoneSignInCode,
  resetPhoneSignIn,
  signInWithGoogleAdmin,
  signOutAdmin,
} from "../shared/api/firebase";
import {firebaseApp} from "../shared/api/firebaseCore";
import {
  adminPathForNav,
  adminRoutes,
  adminSections,
  marketingPathForTab,
  resolveAdminRoute,
  type AdminNavId,
} from "./adminRoutes";
import {useAdminSession} from "./useAdminSession";
import {AdminQueryProvider} from "../shared/query/queryClient";
import {dataMode} from "../shared/api/dataMode";
import {
  AdminRoleClaim,
  DataMode,
  adminRoleClaimKeys,
} from "../shared/types/adminTypes";
import {AdminFeedbackProvider} from "../shared/feedback/AdminFeedbackContext";
import {AdminPendingOperationProvider} from "../shared/pendingOperation";
import type {OverviewQueueDestination} from
  "../features/overview/ui/OverviewScreen";

const PartnerRouteApp = lazy(() => import("./PartnerRouteApp").then((m) => ({default: m.PartnerRouteApp})));
const OperatorSessionRoute = lazy(() => import("../features/operator-session/ui/OperatorSessionScreen").then((m) => ({default: m.OperatorSessionScreen})));

type PhoneSignInStage = "phone" | "code";

const MarketingOpsScreen = lazy(() =>
  import("../features/marketing/ui/MarketingOpsScreen").then((module) => ({
    default: module.MarketingOpsScreen,
  }))
);

const IntakeWorkspaceScreen = lazy(() =>
  import("../features/intake/ui/IntakeWorkspaceScreen").then(
    (module) => ({
      default: module.IntakeWorkspaceScreen,
    })
  )
);
const SafetyTriageScreen = lazy(() =>
  import("../features/safety/ui/SafetyTriageScreen").then((module) => ({
    default: module.SafetyTriageScreen,
  }))
);
const AccessReviewScreen = lazy(() =>
  import("../features/access/ui/AccessReviewScreen").then((module) => ({
    default: module.AccessReviewScreen,
  }))
);
const GrowthKpiScreen = lazy(() =>
  import("../features/growth/ui/GrowthKpiScreen").then((module) => ({
    default: module.GrowthKpiScreen,
  }))
);
const FinanceOpsScreen = lazy(() =>
  import("../features/finance/ui/FinanceOpsScreen").then((module) => ({
    default: module.FinanceOpsScreen,
  }))
);
const OrganizerPublishingScreen = lazy(() =>
  import("../features/organizers/ui/OrganizerPublishingScreen").then(
    (module) => ({
      default: module.OrganizerPublishingScreen,
    })
  )
);
const EventPublishingScreen = lazy(() =>
  import("../features/events/ui/EventPublishingScreen").then((module) => ({
    default: module.EventPublishingScreen,
  }))
);
const UserAnalyticsScreen = lazy(() =>
  import("../features/users/ui/UserAnalyticsScreen").then((module) => ({
    default: module.UserAnalyticsScreen,
  }))
);
const CrossPathsShowcaseScreen = lazy(() =>
  import("../features/cross-paths/ui/CrossPathsShowcaseScreen").then(
    (module) => ({default: module.CrossPathsShowcaseScreen})
  )
);
const OverviewRouteScreen = lazy(() =>
  import("../features/overview/ui/OverviewRouteScreen").then((module) => ({
    default: module.OverviewRouteScreen,
  }))
);
const DataQualityScreen = lazy(() =>
  import("../features/data-quality/ui/DataQualityScreen").then((module) => ({
    default: module.DataQualityScreen,
  }))
);
const AdminRoleManagementScreen = lazy(() =>
  import("../features/admin-roles/ui/AdminRoleManagementScreen").then(
    (module) => ({
      default: module.AdminRoleManagementScreen,
    })
  )
);
const AdminActionExecutionsScreen = lazy(() =>
  import("../features/operations/ui/AdminActionExecutionsScreen").then(
    (module) => ({default: module.AdminActionExecutionsScreen})
  )
);
const CatchWhatsappTrialWorkspace = lazy(() =>
  import("../features/catch-support/ui/CatchWhatsappTrialWorkspace")
    .then((module) => ({default: module.CatchWhatsappTrialWorkspace}))
);

const SalesWorkspaceScreen = lazy(() =>
  import("../features/sales/ui/SalesWorkspaceScreen").then((module) => ({
    default: module.SalesWorkspaceScreen,
  }))
);

interface AdminNavigationItem {
  id: AdminNavId;
  label: string;
  icon: typeof Activity;
}

const navigationGroups: Array<{
  id: string;
  label: string;
  items: AdminNavigationItem[];
}> = [
  {
    id: "queues",
    label: "Work queues",
    items: [
      {id: "overview", label: "Overview", icon: Activity},
      {id: "sales", label: "Sales", icon: HeartHandshake},
      {id: "safety", label: "Safety", icon: ShieldAlert},
      {id: "access", label: "Launch access", icon: UserCheck},
      {id: "cross-paths", label: "Cross Paths", icon: HeartHandshake},
    ],
  },
  {
    id: "supply",
    label: "Supply",
    items: [
      {id: "organizer-intake", label: "Intake", icon: FolderSearch},
      {id: "organizers", label: "Organizers", icon: Users},
      {id: "events", label: "Events", icon: BarChart3},
    ],
  },
  {
    id: "growth",
    label: "Growth & insights",
    items: [
      {id: "growth", label: "Growth", icon: LineChart},
      {id: "marketing-ops", label: "Marketing", icon: Megaphone},
      {id: "users", label: "Users", icon: Sparkles},
      {id: "finance", label: "Finance", icon: CircleDollarSign},
    ],
  },
  {
    id: "automation",
    label: "Automation",
    items: [
      {id: "operations", label: "Agent activity", icon: Bot},
    ],
  },
  {
    id: "governance",
    label: "Governance",
    items: [
      {id: "quality", label: "Data quality", icon: Database},
      {id: "admin-roles", label: "Admin roles", icon: Lock},
    ],
  },
];

const navigation = navigationGroups.flatMap((group) => group.items);

const navRoleMap: Record<AdminNavId, readonly AdminRoleClaim[]> = {
  overview: adminRoleClaimKeys.filter((role) => role !== "salesStaff"),
  safety: ["admin", "adminOwner", "safetyReviewer", "support"],
  access: ["admin", "adminOwner", "support"],
  "cross-paths": ["admin", "adminOwner", "safetyReviewer", "support"],
  growth: ["adminOwner", "analyticsViewer"],
  "marketing-ops": ["admin", "adminOwner", "support"],
  sales: ["admin", "adminOwner", "salesStaff"],
  "organizer-intake": ["admin", "adminOwner", "support"],
  organizers: ["admin", "adminOwner", "support"],
  events: ["admin", "adminOwner", "support"],
  users: ["adminOwner", "analyticsViewer"],
  finance: ["adminOwner", "analyticsViewer", "finance"],
  quality: ["adminOwner"],
  operations: ["admin", "adminOwner", "support"],
  "admin-roles": ["adminOwner"],
};

const hostAnalyticsRoles: readonly AdminRoleClaim[] = [
  "adminOwner",
  "analyticsViewer",
];

const adminSidebarPreferenceKey = "catch-admin.sidebar-collapsed.v1";

function readAdminSidebarPreference(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(adminSidebarPreferenceKey) === "true";
  } catch {
    return false;
  }
}

function writeAdminSidebarPreference(collapsed: boolean): void {
  try {
    window.localStorage.setItem(
      adminSidebarPreferenceKey,
      String(collapsed)
    );
  } catch {
    // The in-memory preference still works when storage is unavailable.
  }
}

export function App() {
  const [router] = useState(() => createBrowserRouter([
    {
      path: "/operator-session",
      element: <Suspense fallback={<AdminFeatureLoadingState label="Loading session handoff" />}>
        <OperatorSessionRoute />
      </Suspense>,
    },
    {
      path: "/partners/*",
      element: <Suspense fallback={<AdminFeatureLoadingState label="Loading partner workspace" />}>
        <PartnerRouteApp />
      </Suspense>,
    },
    ...adminRoutes.map((route) => ({...route, element: <AdminRouteApp />})),
  ]));
  return <RouterProvider router={router} />;
}

// Async controller continuations may outlive their query provider. Their old
// feedback callbacks must not display private identifiers in a newer session.
function useSessionFeedback({epoch, isCurrent}: ReturnType<typeof useAdminSession>) {
  const [feedback, setFeedback] = useState<{
    epoch: number;
    error: string | null;
    notice: string | null;
  }>({epoch, error: null, notice: null});
  const setError = useCallback((error: string | null) => {
    if (!isCurrent()) return;
    setFeedback((current) => ({
      epoch, error, notice: current.epoch === epoch ? current.notice : null,
    }));
  }, [epoch, isCurrent]);
  const setNotice = useCallback((notice: string | null) => {
    if (!isCurrent()) return;
    setFeedback((current) => ({
      epoch, notice, error: current.epoch === epoch ? current.error : null,
    }));
  }, [epoch, isCurrent]);
  return {
    error: feedback.epoch === epoch ? feedback.error : null,
    notice: feedback.epoch === epoch ? feedback.notice : null,
    setError,
    setNotice,
  };
}

function AdminRouteApp() {
  const mode = dataMode();
  const location = useLocation();
  const navigate = useNavigate();
  const adminEnvironment = String(
    import.meta.env.VITE_ADMIN_FIREBASE_ENV ?? "dev"
  );

  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthActionPending, setIsAuthActionPending] = useState(false);
  const [phoneCode, setPhoneCode] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneSignInStage, setPhoneSignInStage] =
    useState<PhoneSignInStage>("phone");
  const session = useAdminSession(mode);
  const {error, notice, setError, setNotice} = useSessionFeedback(session);
  const {user, roles: adminRoles, resolved: rolesResolved} = session;
  const isRoleCheckPending = Boolean(user && !rolesResolved);
  const [isSidebarCollapsed, setIsSidebarCollapsed] =
    useState(readAdminSidebarPreference);
  const [marketingDirty, setMarketingDirty] = useState(false);
  const blocker = useBlocker(useCallback(({currentLocation, nextLocation}) =>
    marketingDirty &&
    resolveAdminRoute(currentLocation.pathname).nav === "marketing-ops" &&
    resolveAdminRoute(nextLocation.pathname).nav !== "marketing-ops",
  [marketingDirty]));

  useEffect(() => {
    if (blocker.state !== "blocked") return;
    if (window.confirm("Discard unsaved Marketing edits and leave Marketing?")) {
      blocker.proceed();
    } else {
      blocker.reset();
    }
  }, [blocker]);

  useEffect(() => {
    setError(null);
    setNotice(null);
    setMarketingDirty(false);
    setAuthError(null);
    if (user) {
      resetPhoneSignIn();
      setPhoneCode("");
      setPhoneNumber("");
      setPhoneSignInStage("phone");
    }
  }, [session.epoch, setError, setNotice, user]);

  const visibleNavigation = useMemo(
    () => navigation.filter((item) =>
      mode === "sample" ||
      hasAnyAdminRole(adminRoles, navRoleMap[item.id])),
    [adminRoles, mode]
  );
  const route = resolveAdminRoute(location.pathname);
  const routeNav = route.nav;
  const routeNavVisible = routeNav !== null &&
    visibleNavigation.some((item) => item.id === routeNav);
  const currentNav: AdminNavId = routeNavVisible ?
    routeNav :
    visibleNavigation[0]?.id ?? "overview";
  const canResolveNavigation = mode !== "live" ||
    (user !== null && rolesResolved && adminRoles.length > 0);

  useEffect(() => {
    if (!canResolveNavigation) return;
    if (routeNav === currentNav) return;
    navigate(adminPathForNav(currentNav), {replace: true});
  }, [canResolveNavigation, currentNav, navigate, routeNav]);

  const setActiveNav = useCallback((nextNav: AdminNavId) => {
    navigate(adminPathForNav(nextNav));
  }, [navigate]);

  const handleSidebarCollapsedChange = useCallback((collapsed: boolean) => {
    setIsSidebarCollapsed(collapsed);
    writeAdminSidebarPreference(collapsed);
  }, []);

  const handleRequestPhoneCode = useCallback(async () => {
    const normalizedPhoneNumber = normalizeAdminPhoneNumber(phoneNumber);
    if (!normalizedPhoneNumber) {
      setAuthError(
        "Enter a valid phone number with country code, such as +91 90000 00000."
      );
      return;
    }
    setAuthError(null);
    setIsAuthActionPending(true);
    try {
      await requestPhoneSignInCode(normalizedPhoneNumber);
      setPhoneNumber(normalizedPhoneNumber);
      setPhoneCode("");
      setPhoneSignInStage("code");
    } catch (phoneSignInError) {
      setAuthError(
        phoneSignInError instanceof Error ?
          phoneSignInError.message :
          "Unable to send the phone verification code."
      );
    } finally {
      setIsAuthActionPending(false);
    }
  }, [phoneNumber]);

  const handleGoogleSignIn = useCallback(async () => {
    setAuthError(null);
    setIsAuthActionPending(true);
    try {
      await signInWithGoogleAdmin();
    } catch {
      setAuthError("Unable to sign in with Google. Try again.");
    } finally {
      setIsAuthActionPending(false);
    }
  }, []);

  const handleVerifyPhoneCode = useCallback(async () => {
    const normalizedCode = phoneCode.replace(/\s+/gu, "");
    if (!/^\d{6}$/u.test(normalizedCode)) {
      setAuthError("Enter the six-digit phone verification code.");
      return;
    }
    setAuthError(null);
    setIsAuthActionPending(true);
    try {
      await confirmPhoneSignInCode(normalizedCode);
      setPhoneCode("");
      setPhoneNumber("");
      setPhoneSignInStage("phone");
    } catch (phoneSignInError) {
      setAuthError(
        phoneSignInError instanceof Error ?
          phoneSignInError.message :
          "Unable to verify the phone code."
      );
    } finally {
      setIsAuthActionPending(false);
    }
  }, [phoneCode]);

  const handleResetPhoneSignIn = useCallback(() => {
    resetPhoneSignIn();
    setAuthError(null);
    setPhoneCode("");
    setPhoneSignInStage("phone");
  }, []);

  const handleSignOut = useCallback(async () => {
    setAuthError(null);
    setIsAuthActionPending(true);
    void session.clearSession();
    try {
      await signOutAdmin();
      setPhoneCode("");
      setPhoneNumber("");
      setPhoneSignInStage("phone");
      setNotice(null);
      setError(null);
    } catch (signOutError) {
      setAuthError(
        signOutError instanceof Error ?
          signOutError.message :
          "Unable to sign out."
      );
    } finally {
      setIsAuthActionPending(false);
    }
  }, [session.clearSession, setError, setNotice]);

  const handleRefreshAdminClaims = useCallback(async () => {
    setAuthError(null);
    await session.refreshClaims();
  }, [session.refreshClaims]);

  const handleOverviewQueueOpen = useCallback((
    destination: OverviewQueueDestination,
    targetPath?: string | null
  ) => {
    const destinationItem = visibleNavigation.find((item) =>
      item.id === destination
    );
    if (!destinationItem) {
      setNotice(null);
      setError(`Your admin role cannot open the ${destination} workflow.`);
      return;
    }
    setError(null);
    setNotice(null);
    if (targetPath && destination === "safety") {
      navigate(`/safety/${encodeURIComponent(targetPath)}`);
      return;
    }
    const targetId = targetPath?.split("/").filter(Boolean).at(-1) ?? null;
    if (targetId && destination === "access") {
      navigate(`/access/${encodeURIComponent(targetId)}`);
      return;
    }
    if (targetId && destination === "organizers") {
      navigate(targetPath?.startsWith("clubClaimRequests/") ?
        `/organizers/claims/${encodeURIComponent(targetId)}` :
        `/organizers/${encodeURIComponent(targetId)}`);
      return;
    }
    if (targetPath && destination === "finance") {
      navigate(`/finance/issues/${encodeURIComponent(targetPath)}`);
      return;
    }
    setActiveNav(destination);
  }, [navigate, setActiveNav, setError, setNotice, visibleNavigation]);

  const topbarTitle = (routeNav === currentNav ? route.title : undefined) ?? adminSections[currentNav].title;

  useEffect(() => {
    const nextTitle = mode === "live" && !user ?
      "Catch Admin" :
      `${topbarTitle} — Catch Admin`;
    document.title = nextTitle;
  }, [mode, topbarTitle, user]);

  if (mode === "live" && !user) {
    return (
      <SignInScreen
        error={authError ?? session.error}
        isSigningIn={isAuthActionPending}
        phoneCode={phoneCode}
        phoneNumber={phoneNumber}
        phoneSignInStage={phoneSignInStage}
        onPhoneCodeChange={setPhoneCode}
        onPhoneNumberChange={setPhoneNumber}
        onRequestPhoneCode={() => void handleRequestPhoneCode()}
        onResetPhoneSignIn={handleResetPhoneSignIn}
        onVerifyPhoneCode={() => void handleVerifyPhoneCode()}
        onGoogleSignIn={() => void handleGoogleSignIn()}
      />
    );
  }
  if (mode === "live" && user && !rolesResolved) {
    return (
      <AuthCheckScreen
        email={user.email ?? user.uid}
        error={authError ?? session.error}
        isPending={isRoleCheckPending}
        onSignOut={() => void handleSignOut()}
      />
    );
  }
  if (mode === "live" && user && adminRoles.length === 0) {
    return (
      <UnauthorizedAdminScreen
        email={user.email ?? user.uid}
        error={authError ?? session.error}
        isPending={isRoleCheckPending || isAuthActionPending}
        onRefreshClaims={() => void handleRefreshAdminClaims()}
        onSignOut={() => void handleSignOut()}
      />
    );
  }

  const sessionKey = JSON.stringify([mode, user?.uid, session.epoch]);
  return (
    <AdminPendingOperationProvider key={sessionKey}>
    <AdminQueryProvider
      sessionKey={sessionKey}
      isCurrentSession={session.isCurrent}
    >
    <AdminAppShell
      intakeMode={currentNav === "organizer-intake"}
      sidebarCollapsed={isSidebarCollapsed}
    >
      <AdminSidebar aria-label="Admin sections" id="admin-sidebar">
        <AdminBrandBlock>
          <AdminBrandMark>C</AdminBrandMark>
          <AdminBrandCopy>
            <AdminBrandTitle>Catch Admin</AdminBrandTitle>
          </AdminBrandCopy>
        </AdminBrandBlock>
        <AdminNavList aria-label="Admin navigation">
          {navigationGroups.map((group) => {
            const visibleItems = group.items.filter((item) =>
              visibleNavigation.some((visibleItem) =>
                visibleItem.id === item.id
              )
            );
            if (visibleItems.length === 0) return null;
            return (
              <AdminNavGroup key={group.id} label={group.label}>
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  const selected = currentNav === item.id;
                  return (
                    <AdminNavButton
                      icon={<Icon aria-hidden="true" size={17} strokeWidth={1.8} />}
                      key={item.id}
                      label={item.label}
                      onClick={() => setActiveNav(item.id)}
                      selected={selected}
                      title={isSidebarCollapsed ? item.label : undefined}
                    />
                  );
                })}
              </AdminNavGroup>
            );
          })}
        </AdminNavList>
        <AdminSidebarToggle
          collapsed={isSidebarCollapsed}
          controlsId="admin-sidebar"
          onCollapsedChange={handleSidebarCollapsedChange}
        />
      </AdminSidebar>

      <AdminWorkspace
        intakeMode={currentNav === "organizer-intake"}
      >
        <AdminTopbar>
          <CatchText as="h1" variant="titleL">{topbarTitle}</CatchText>
          <AdminTopbarActions>
            <AdminEnvironmentStatus
              environment={adminEnvironment}
            />
            <AdminAccountMenu
              isSigningOut={isAuthActionPending}
              mode={mode}
              onSignOut={mode === "live" ?
                () => void handleSignOut() :
                undefined}
              roles={adminRoles}
              userLabel={
                user?.displayName ??
                user?.email ??
                user?.phoneNumber ??
                user?.uid ??
                "Local preview"
              }
            />
          </AdminTopbarActions>
        </AdminTopbar>

        <AdminFeedbackProvider onError={setError} onNotice={setNotice}>
          {error && (
            <StatusBanner
              icon={<AlertTriangle size={17} strokeWidth={1.9} />}
              tone="error"
            >
              {error}
            </StatusBanner>
          )}
          {notice && (
            <StatusBanner
              icon={<CheckCircle2 size={17} strokeWidth={1.9} />}
              tone="success"
            >
              {notice}
            </StatusBanner>
          )}

          {currentNav === "overview" &&
            (adminRoles.includes("support") || adminRoles.includes("adminOwner")) ? (
            <Suspense fallback={<AdminFeatureLoadingState label="Loading support trial" />}>
              <CatchWhatsappTrialWorkspace
                scope={{actorUid: user?.uid ?? "", projectId: firebaseApp.options.projectId ?? "",
                  sessionKey, isCurrent: session.isCurrent}}
              />
            </Suspense>
          ) : null}

          {currentNav === "sales" ? (
          <Suspense fallback={<AdminFeatureLoadingState label="Loading Sales" />}>
            <SalesWorkspaceScreen
              area={route.salesArea}
              isAdminOwner={adminRoles.includes("adminOwner")}
              assignedStaffOnly={adminRoles.includes("salesStaff") &&
                !adminRoles.some((role) => role === "admin" || role === "adminOwner")}
              currentUserUid={user?.uid ?? (mode === "sample" ? "sample-owner" : "")}
              selectedOrganizerId={route.params.salesOrganizerId ?? null}
              onAreaChange={(area) => navigate(`/sales/${area}`)}
              onOpenHost={(organizerId) => navigate(
                `/sales/hosts/${encodeURIComponent(organizerId)}`
              )}
              onBackToHosts={() => navigate("/sales/hosts")}
              onOpenIntake={() => navigate("/intake/organizers")}
              onOpenOrganizer={(organizerId) => navigate(
                `/organizers/${encodeURIComponent(organizerId)}`
              )}
            />
          </Suspense>
        ) : currentNav === "safety" ? (
          <Suspense fallback={<AdminFeatureLoadingState label="Loading Safety" />}>
            <SafetyTriageScreen
              onError={setError}
              onNotice={setNotice}
              selectedTargetPath={route.params.targetPath ?? null}
              onBackToList={() => navigate(adminPathForNav("safety"))}
              onSelectTargetPath={(targetPath) => {
                navigate(
                  `${adminPathForNav("safety")}/${encodeURIComponent(targetPath)}`
                );
              }}
            />
          </Suspense>
        ) : currentNav === "marketing-ops" ? (
          <Suspense fallback={<AdminFeatureLoadingState label="Loading Marketing" />}>
            <MarketingOpsScreen
              activeTab={route.marketingTab}
              composerStep={route.composerStep}
              onComposerStepChange={(step) => {
                const draftId = route.params.draftId ?? null;
                if (draftId) {
                  navigate(`/marketing/drafts/${encodeURIComponent(draftId)}/${step}`);
                }
              }}
              onDraftOpen={(draftId, step) => {
                navigate(`/marketing/drafts/${encodeURIComponent(draftId)}/${step}`);
              }}
              onError={setError}
              onNotice={setNotice}
              onTabChange={(tab) => navigate(marketingPathForTab(tab))}
              onUnsavedChangesChange={setMarketingDirty}
              selectedDraftId={route.params.draftId ?? null}
            />
          </Suspense>
        ) : currentNav === "access" ? (
          <Suspense fallback={<AdminFeatureLoadingState label="Loading Access" />}>
            <AccessReviewScreen
              selectedApplicationUid={route.params.applicationUid ?? null}
              onBackToList={() => navigate(adminPathForNav("access"))}
              onError={setError}
              onNotice={setNotice}
              onSelectApplicationUid={(applicationUid) => {
                navigate(`${adminPathForNav("access")}/${encodeURIComponent(applicationUid)}`);
              }}
            />
          </Suspense>
        ) : currentNav === "growth" ? (
          <Suspense fallback={<AdminFeatureLoadingState label="Loading Growth" />}>
            <GrowthKpiScreen
              onBackToList={() => navigate(adminPathForNav("growth"))}
              onError={setError}
              onSelectSignalId={(signalId) => {
                navigate(`/growth/signals/${encodeURIComponent(signalId)}`);
              }}
              selectedSignalId={route.params.growthSignalId ?? null}
            />
          </Suspense>
        ) : currentNav === "organizer-intake" ? (
          <Suspense fallback={<AdminFeatureLoadingState label="Loading Intake" />}>
            <IntakeWorkspaceScreen />
          </Suspense>
        ) : currentNav === "organizers" ? (
          <Suspense fallback={<AdminFeatureLoadingState label="Loading Organizers" />}>
            <OrganizerPublishingScreen
              activeWorkspace={route.organizerWorkspace}
              selectedClubId={route.params.clubId ?? null}
              onBackToList={() => navigate(adminPathForNav("organizers"))}
              onBackToClaims={() => navigate(`${adminPathForNav("organizers")}/claims`)}
              onSelectClaimRequestId={(requestId) => {
                navigate(
                  `${adminPathForNav("organizers")}/claims/${encodeURIComponent(requestId)}`
                );
              }}
              onSelectClubId={(clubId) => {
                navigate(`${adminPathForNav("organizers")}/${encodeURIComponent(clubId)}`);
              }}
              onWorkspaceChange={(workspace) => {
                navigate(workspace === "claims" ?
                  `${adminPathForNav("organizers")}/claims` :
                  adminPathForNav("organizers"));
              }}
              selectedClaimRequestId={route.params.claimRequestId ?? null}
            />
          </Suspense>
        ) : currentNav === "events" ? (
          <Suspense fallback={<AdminFeatureLoadingState label="Loading Events" />}>
            <EventPublishingScreen
              activeWorkspace={route.eventWorkspace}
              selectedEventId={route.params.eventId ?? null}
              selectedExternalEventId={route.params.externalEventId ?? null}
              selectedReadinessActionId={route.params.readinessActionId ?? null}
              onBackToList={() => navigate(
                `${adminPathForNav("events")}${location.search}`
              )}
              onSelectEventId={(eventId) => {
                navigate(
                  `${adminPathForNav("events")}/${encodeURIComponent(eventId)}` +
                  location.search
                );
              }}
              onSelectExternalEventId={(eventId) => {
                navigate(eventId ?
                  `${adminPathForNav("events")}/external/${encodeURIComponent(eventId)}` +
                    location.search :
                  `${adminPathForNav("events")}/external${location.search}`);
              }}
              onSelectReadinessActionId={(sourceActionId) => {
                navigate(sourceActionId ?
                  `${adminPathForNav("events")}/readiness/${encodeURIComponent(sourceActionId)}` +
                    location.search :
                  `${adminPathForNav("events")}/readiness${location.search}`);
              }}
              onWorkspaceChange={(workspace) => {
                navigate(workspace === "directory" ?
                  adminPathForNav("events") :
                  `${adminPathForNav("events")}/${workspace}`);
              }}
            />
          </Suspense>
        ) : currentNav === "users" ? (
          <Suspense fallback={<AdminFeatureLoadingState label="Loading Users" />}>
            <UserAnalyticsScreen
              handoffRequestId={null}
              handoffUserId={null}
              onError={setError}
              onNotice={setNotice}
            />
          </Suspense>
        ) : currentNav === "cross-paths" ? (
          <Suspense fallback={
            <AdminFeatureLoadingState label="Loading Cross Paths" />
          }>
            <CrossPathsShowcaseScreen
              canDecide={mode === "sample" || hasAnyAdminRole(
                adminRoles,
                ["admin", "adminOwner", "safetyReviewer"]
              )}
              onError={setError}
              onNotice={setNotice}
            />
          </Suspense>
        ) : currentNav === "finance" ? (
          <Suspense fallback={<AdminFeatureLoadingState label="Loading Finance" />}>
            <FinanceOpsScreen
              key={user?.uid ?? "sample"}
              actorUid={user?.uid ?? "sample"}
              adminRoles={adminRoles}
              onBackToList={() => navigate(adminPathForNav("finance"))}
              onError={setError}
              onNotice={setNotice}
              onSelectIssueId={(issueId) => {
                navigate(`/finance/issues/${encodeURIComponent(issueId)}`);
              }}
              selectedIssueId={route.params.financeIssueId ?? null}
            />
          </Suspense>
        ) : currentNav === "quality" ? (
          <Suspense fallback={<AdminFeatureLoadingState label="Loading Data quality" />}>
            <DataQualityScreen
              onBackToList={() => navigate(adminPathForNav("quality"))}
              onError={setError}
              onOpenOwningWorkflow={(path) => navigate(path)}
              onSelectSignalId={(signalId) => {
                navigate(`/quality/signals/${encodeURIComponent(signalId)}`);
              }}
              selectedSignalId={route.params.qualitySignalId ?? null}
            />
          </Suspense>
        ) : currentNav === "admin-roles" ? (
          <Suspense fallback={<AdminFeatureLoadingState label="Loading Admin roles" />}>
            <AdminRoleManagementScreen
              currentUserUid={user?.uid ?? null}
              onBackToRegister={() => navigate(adminPathForNav("admin-roles"))}
              onError={setError}
              onNotice={setNotice}
              onSelectTargetUid={(targetUid) => {
                navigate(`/admin-roles/${encodeURIComponent(targetUid)}`);
              }}
              selectedTargetUid={route.params.adminRoleTargetUid ?? null}
            />
          </Suspense>
        ) : currentNav === "operations" ? (
          <Suspense fallback={<AdminFeatureLoadingState label="Loading Agent activity" />}>
            <AdminActionExecutionsScreen onError={setError} />
          </Suspense>
        ) : (
          <Suspense fallback={<AdminFeatureLoadingState label="Loading Overview" />}>
            <OverviewRouteScreen
              adminRoles={adminRoles}
              isSessionReady={mode === "sample" ||
                (rolesResolved && adminRoles.length > 0)}
              mode={mode}
              onError={setError}
              onNotice={setNotice}
              onOpenQueue={handleOverviewQueueOpen}
            />
          </Suspense>
        )}
        </AdminFeedbackProvider>
      </AdminWorkspace>
    </AdminAppShell>
    </AdminQueryProvider>
    </AdminPendingOperationProvider>
  );
}

function hasAnyAdminRole(
  roles: string[],
  allowedRoles: readonly AdminRoleClaim[]
): boolean {
  return allowedRoles.some((role) => roles.includes(role));
}

function normalizeAdminPhoneNumber(value: string): string | null {
  const normalized = value.replace(/[\s()-]+/gu, "");
  return /^\+[1-9]\d{7,14}$/u.test(normalized) ? normalized : null;
}

function SignInScreen({
  error,
  isSigningIn,
  onPhoneCodeChange,
  onPhoneNumberChange,
  onRequestPhoneCode,
  onResetPhoneSignIn,
  onVerifyPhoneCode,
  onGoogleSignIn,
  phoneCode,
  phoneNumber,
  phoneSignInStage,
}: {
  error: string | null;
  isSigningIn: boolean;
  onPhoneCodeChange: (value: string) => void;
  onPhoneNumberChange: (value: string) => void;
  onRequestPhoneCode: () => void;
  onResetPhoneSignIn: () => void;
  onVerifyPhoneCode: () => void;
  onGoogleSignIn: () => void;
  phoneCode: string;
  phoneNumber: string;
  phoneSignInStage: PhoneSignInStage;
}) {
  const handlePhoneSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (phoneSignInStage === "phone") {
      onRequestPhoneCode();
    } else {
      onVerifyPhoneCode();
    }
  };

  return (
    <AdminSignInScreen>
      <AdminSignInPanel>
        <AdminBrandMark size="large">C</AdminBrandMark>
        <CatchText as="h1" variant="headline">Catch Admin</CatchText>
        <CatchText as="p" variant="supporting">Internal admin access requires Firebase Auth and an admin claim.</CatchText>
        {error && (
          <StatusBanner
            icon={<AlertTriangle size={17} strokeWidth={1.9} />}
            tone="error"
          >
            {error}
          </StatusBanner>
        )}
        <AdminButton disabled={isSigningIn} onClick={onGoogleSignIn}>
          Sign in with Google
        </AdminButton>
        <AdminForm onSubmit={handlePhoneSubmit}>
          {phoneSignInStage === "phone" ? (
            <CatchField
              recipe="input"
              autoComplete="tel"
              inputMode={isSigningIn ? "inactive" : "editable"}
              title="Phone number"
              name="phone"
              onChanged={onPhoneNumberChange}
              inputHint="+91 90000 00000"
              value={phoneNumber}
              keyboardType="phone"
            />
          ) : (
            <>
              <AdminSignInMeta>
                Verification code sent to {phoneNumber}.
              </AdminSignInMeta>
              <CatchField
                recipe="input"
                autoComplete="one-time-code"
                inputMode={isSigningIn ? "inactive" : "editable"}
                title="Verification code"
                maxLength={6}
                name="verification-code"
                onChanged={onPhoneCodeChange}
                inputHint="000000"
                value={phoneCode}
                keyboardType="number"
              />
            </>
          )}
          <AdminSignInActions>
            <AdminButton
              disabled={isSigningIn}
              type="submit"
              variant="primary"
            >
              {phoneSignInStage === "phone" ?
                (isSigningIn ? "Sending code" : "Send verification code") :
                (isSigningIn ? "Verifying" : "Verify and sign in")}
            </AdminButton>
            {phoneSignInStage === "code" ? (
              <AdminButton
                disabled={isSigningIn}
                onClick={onResetPhoneSignIn}
              >
                Use another phone
              </AdminButton>
            ) : null}
          </AdminSignInActions>
        </AdminForm>
        <div id="admin-phone-recaptcha" />
      </AdminSignInPanel>
    </AdminSignInScreen>
  );
}

function AuthCheckScreen({
  email,
  error,
  isPending,
  onSignOut,
}: {
  email: string;
  error: string | null;
  isPending: boolean;
  onSignOut: () => void;
}) {
  return (
    <AdminSignInScreen>
      <AdminSignInPanel>
        <AdminBrandMark size="large">C</AdminBrandMark>
        <CatchText as="h1" variant="headline">Checking admin access</CatchText>
        <CatchText as="p" variant="supporting">{email}</CatchText>
        {error ? (
          <StatusBanner
            icon={<AlertTriangle size={17} strokeWidth={1.9} />}
            tone="error"
          >
            {error}
          </StatusBanner>
        ) : (
          <AdminSignInMeta>
            <AdminLoadingIcon active={isPending} />
            <span>Reading Firebase custom claims.</span>
          </AdminSignInMeta>
        )}
        <AdminButton disabled={isPending} onClick={onSignOut}>
          Sign out
        </AdminButton>
      </AdminSignInPanel>
    </AdminSignInScreen>
  );
}

function UnauthorizedAdminScreen({
  email,
  error,
  isPending,
  onRefreshClaims,
  onSignOut,
}: {
  email: string;
  error: string | null;
  isPending: boolean;
  onRefreshClaims: () => void;
  onSignOut: () => void;
}) {
  return (
    <AdminSignInScreen>
      <AdminSignInPanel>
        <AdminBrandMark size="large">C</AdminBrandMark>
        <CatchText as="h1" variant="headline">Admin claim required</CatchText>
        <CatchText as="p" variant="supporting">
          {email} is signed in, but this Firebase session does not include a
          Catch admin custom claim.
        </CatchText>
        <AdminSignInMeta>
          <Lock size={17} strokeWidth={1.9} />
          <span>Ask an admin owner to assign a role, then refresh claims.</span>
        </AdminSignInMeta>
        {error && (
          <StatusBanner
            icon={<AlertTriangle size={17} strokeWidth={1.9} />}
            tone="error"
          >
            {error}
          </StatusBanner>
        )}
        <AdminSignInActions>
          <AdminButton
            disabled={isPending}
            onClick={onRefreshClaims}
            variant="primary"
          >
            {isPending ? "Refreshing" : "Refresh claims"}
          </AdminButton>
          <AdminButton disabled={isPending} onClick={onSignOut}>
            Sign out
          </AdminButton>
        </AdminSignInActions>
      </AdminSignInPanel>
    </AdminSignInScreen>
  );
}
