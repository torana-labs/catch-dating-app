import {
  CatchButton,
  CatchGap,
  CatchTabBar,
  CatchText,
  CatchViewport,
  CatchWorkspaceHeader,
  type CatchTabBarItem,
} from "@catch/web-ui";
import {AlertTriangle, CheckCircle2} from "lucide-react";
import {Suspense} from "react";
import {AdminFeedbackProvider} from "../shared/feedback/AdminFeedbackContext";
import {useAdminOperationPending} from "../shared/pendingOperation";
import {
  AdminFeatureLoadingState,
  AdminWorkspace,
  StatusBanner,
} from "../shared/ui/AdminPrimitives";
import type {AdminNavigationEntry} from "./adminAccess";
import {adminAreas, type AdminAreaContext} from "./adminAreas";
import {adminPathForNav, type AdminNavId} from "./adminRoutes";

export interface AdminShellAccount {
  userLabel: string;
  jobLabel: string;
  environment: string;
  isSigningOut: boolean;
  onSignOut?: () => void;
}

/**
 * The signed-in Admin shell: the quiet register, the job's navigation and the current area.
 * Loaded after sign-in, so the sign-in page does not carry the navigation, icons or screens.
 */
export function AdminShellFrame({
  account,
  context,
  currentNav,
  error,
  headerNote,
  navigation,
  notice,
  pageTitle,
}: {
  account: AdminShellAccount;
  context: Omit<AdminAreaContext, "navigation">;
  currentNav: AdminNavId;
  error: string | null;
  headerNote: string;
  navigation: AdminNavigationEntry[];
  notice: string | null;
  pageTitle: string;
}) {
  // While an operation is saving, the navigation stays put, as the workspace's own controls do.
  const operationPending = useAdminOperationPending();
  const items: CatchTabBarItem[] = navigation.map(({nav, section, pinned, label}) => ({
    value: nav,
    label: label ?? adminAreas[nav].label,
    icon: adminAreas[nav].icon,
    href: adminPathForNav(nav),
    section,
    pinned,
  }));
  const go = (nav: AdminNavId) => {
    if (!operationPending) context.navigate(adminPathForNav(nav));
  };
  const area = adminAreas[currentNav];
  const screen = (
    <Suspense fallback={<AdminFeatureLoadingState label={`Loading ${area.label}`} />}>
      {area.render({...context, navigation: items})}
    </Suspense>
  );
  return (
    <CatchViewport
      navigation={(
        <CatchTabBar
          active={navigation.some((entry) => entry.nav === currentNav) ? currentNav :
            navigation.find((entry) => entry.alsoActive?.includes(currentNav))?.nav ?? currentNav}
          footer={<AccountFooter account={account} />}
          header={{title: "Catch Admin", note: headerNote}}
          items={items}
          label="Admin"
          more={{href: adminPathForNav("more"), onPressed: () => go("more")}}
          onChanged={(nav) => go(nav as AdminNavId)}
        />
      )}
      register="quiet"
    >
      <AdminFeedbackProvider onError={context.setError} onNotice={context.setNotice}>
        {area.frame === "redrawn" ? (
          <>
            <FeedbackBanners error={error} notice={notice} />
            {screen}
          </>
        ) : (
          <>
            <CatchWorkspaceHeader title={pageTitle} />
            <AdminWorkspace intakeMode={area.frame === "legacy-fill"}>
              <FeedbackBanners error={error} notice={notice} />
              {screen}
            </AdminWorkspace>
          </>
        )}
      </AdminFeedbackProvider>
    </CatchViewport>
  );
}

function FeedbackBanners({error, notice}: {error: string | null; notice: string | null}) {
  return (
    <>
      {error ? (
        <StatusBanner icon={<AlertTriangle size={17} strokeWidth={1.9} />} tone="error">
          {error}
        </StatusBanner>
      ) : null}
      {notice ? (
        <StatusBanner icon={<CheckCircle2 size={17} strokeWidth={1.9} />} tone="success">
          {notice}
        </StatusBanner>
      ) : null}
    </>
  );
}

/** Who is signed in, their job and the environment, with sign-out on live data. */
function AccountFooter({account}: {account: AdminShellAccount}) {
  return (
    <CatchGap size="inline">
      <CatchText as="p" variant="supportingStrong">{account.userLabel}</CatchText>
      <CatchText as="p" color="ink2" variant="supporting">{account.jobLabel} · {account.environment}</CatchText>
      {account.onSignOut ? (
        <CatchButton
          label={account.isSigningOut ? "Signing out" : "Sign out"}
          onPressed={account.isSigningOut ? null : account.onSignOut}
          size="sm"
          variant="quiet"
        />
      ) : null}
    </CatchGap>
  );
}
