import {CatchField, CatchText} from "@catch/web-ui";
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
import {AlertTriangle, Lock} from "lucide-react";
import {
  AdminBrandMark,
  AdminButton,
  AdminFeatureLoadingState,
  AdminForm,
  AdminLoadingIcon,
  AdminSignInActions,
  AdminSignInMeta,
  AdminSignInPanel,
  AdminSignInScreen,
  SegmentedControl,
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
  financePathForWorkspace,
  resolveAdminRoute,
  type AdminNavId,
  type FinanceWorkspace,
} from "./adminRoutes";
import {adminAreaRoles, adminNavigation} from "./adminAccess";
import {adminJobFor, adminJobLabels} from "./adminJobs";
import {useAdminSession} from "./useAdminSession";
import {AdminQueryProvider} from "../shared/query/queryClient";
import {dataMode} from "../shared/api/dataMode";
import type {AdminRoleClaim} from "../shared/types/adminTypes";
import {AdminPendingOperationProvider} from "../shared/pendingOperation";

const AdminShellFrame = lazy(() => import("./AdminShellFrame").then((m) => ({default: m.AdminShellFrame})));
const PartnerRouteApp = lazy(() => import("./PartnerRouteApp").then((m) => ({default: m.PartnerRouteApp})));
const OperatorSessionRoute = lazy(() => import("../features/operator-session/ui/OperatorSessionScreen").then((m) => ({default: m.OperatorSessionScreen})));

type PhoneSignInStage = "phone" | "code";

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
  // Sample data previews another job's navigation with ?as=sales or ?as=ops.
  const [jobSearch] = useState(location.search);
  const job = adminJobFor(adminRoles, mode, jobSearch);
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

  const canOpen = useCallback((nav: AdminNavId) =>
    mode === "sample" || hasAnyAdminRole(adminRoles, adminAreaRoles[nav]),
  [adminRoles, mode]);
  const visibleNavigation = useMemo(
    () => adminNavigation[job].filter((entry) => canOpen(entry.nav)),
    [canOpen, job]
  );
  const route = resolveAdminRoute(location.pathname);
  const routeNav = route.nav;
  // An area can be open without being in this job's navigation (an older page, a link).
  const routeNavOpen = routeNav !== null && canOpen(routeNav);
  const currentNav: AdminNavId = routeNavOpen && !route.redirect ?
    routeNav :
    route.redirect && routeNav !== null && canOpen(routeNav) ?
      routeNav :
      visibleNavigation[0]?.nav ?? "now";
  const canResolveNavigation = mode !== "live" ||
    (user !== null && rolesResolved && adminRoles.length > 0);
  // Commercial terms and payment routing are Admin Owner only.
  const canManageCommercialTerms = mode === "sample" ||
    hasAnyAdminRole(adminRoles, ["adminOwner"]);
  const financeWorkspaceSwitch = canManageCommercialTerms ? (
    <SegmentedControl<FinanceWorkspace>
      ariaLabel="Finance workspaces"
      mobileLayout="content"
      options={[
        {id: "issues", label: "Finance issues"},
        {id: "commercial-terms", label: "Commercial terms"},
        {id: "payment-routing", label: "Payment routing"},
      ]}
      onChange={(workspace) => navigate(financePathForWorkspace(workspace))}
      value={route.financeWorkspace}
    />
  ) : null;

  useEffect(() => {
    if (!canResolveNavigation) return;
    if (routeNav === currentNav && !route.redirect) return;
    // An old address goes where its redirect names, when the person may open that area.
    navigate(route.redirect && routeNav === currentNav ? route.redirect : adminPathForNav(currentNav), {replace: true});
  }, [canResolveNavigation, currentNav, navigate, route.redirect, routeNav]);

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

  const pageTitle = (routeNav === currentNav ? route.title : undefined) ?? adminSections[currentNav].title;

  useEffect(() => {
    const nextTitle = mode === "live" && !user ?
      "Catch Admin" :
      `${pageTitle} — Catch Admin`;
    document.title = nextTitle;
  }, [mode, pageTitle, user]);

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
      <Suspense fallback={<AdminFeatureLoadingState label="Loading Catch Admin" />}>
        <AdminShellFrame
          account={{
            userLabel: user?.displayName ?? user?.email ?? user?.phoneNumber ?? user?.uid ?? "Local preview",
            jobLabel: mode === "sample" ? `${adminJobLabels[job]} · sample data` : adminJobLabels[job],
            environment: adminEnvironment,
            isSigningOut: isAuthActionPending,
            onSignOut: mode === "live" ? () => void handleSignOut() : undefined,
          }}
          context={{
            route,
            location,
            navigate,
            mode,
            adminRoles,
            userUid: user?.uid ?? null,
            isSessionReady: mode === "sample" || (rolesResolved && adminRoles.length > 0),
            session: {sessionKey, isCurrent: session.isCurrent, projectId: firebaseApp.options.projectId ?? ""},
            canOpen,
            canManageCommercialTerms,
            financeWorkspaceSwitch,
            setError,
            setNotice,
            setMarketingDirty,
          }}
          currentNav={currentNav}
          error={error}
          headerNote={mode === "sample" ? "Sample data" : `Live · ${adminEnvironment}`}
          navigation={visibleNavigation}
          notice={notice}
          pageTitle={pageTitle}
        />
      </Suspense>
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
