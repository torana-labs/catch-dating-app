import {lazy} from "react";
import {adminPathForNav} from "../adminRoutes";
import type {AdminAreaContext, AdminAreaRender} from "../adminAreaKit";
import {commercialTermsPathForOrganizer} from "./payment-setup";

const FinanceOpsScreen = lazy(() => import("../../features/finance/ui/FinanceOpsScreen").then((m) => ({default: m.FinanceOpsScreen})));
const CommercialTermsScreen = lazy(() => import("../../features/commercial-terms/ui/CommercialTermsScreen").then((m) => ({default: m.CommercialTermsScreen})));
const PaymentRoutingScreen = lazy(() => import("../../features/payment-routing/ui/PaymentRoutingScreen").then((m) => ({default: m.PaymentRoutingScreen})));

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

const render: AdminAreaRender = (context) => renderPaymentSetup(context);

export default render;
