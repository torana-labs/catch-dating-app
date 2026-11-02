import {CatchWorkspaceHeader} from "@catch/web-ui";
import {useMutation} from "@tanstack/react-query";
import {useEffect, useState} from "react";
import {exportMoneyLedger} from "../api/paymentSettingsRepository";
import {useCommercialTermsController} from "../controllers/useCommercialTermsController";
import {usePaymentRoutingController} from "../controllers/usePaymentRoutingController";
import {useMessagingBudgetController} from "../controllers/useMessagingBudgetController";
import {useOrganizerEntitlementController} from "../controllers/useOrganizerEntitlementController";
import {usePaymentSettingsController} from "../controllers/usePaymentSettingsController";
import {renderMessagingBudgetEditor, renderPlansEditor} from "./grantedPlansPanels";
import {
  renderCreditEditor,
  renderPaymentsOverview,
  renderRoutingEditor,
  renderTermsEditor,
  type PaymentsEdit,
} from "./paymentsSettingsPanels";

export type {PaymentsEdit} from "./paymentsSettingsPanels";

const india = "Asia/Kolkata";

/** Last month in India time, the month the export offers. */
function lastMonth(nowMillis: number): {month: string; label: string} {
  const shifted = new Date(nowMillis + 5.5 * 60 * 60 * 1000);
  const date = new Date(Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth() - 1, 15));
  return {
    month: `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`,
    label: new Intl.DateTimeFormat("en-IN", {month: "long", timeZone: india}).format(date),
  };
}

/** Settings → Payments as the shell routes it: the editor and the organizer come from the address. */
export function PaymentSettingsRouteScreen({
  edit,
  termsOrganizerId,
  canManage,
  actorUid,
  onOpen,
  onBackToSettings,
  onError,
  onNotice,
}: {
  edit: PaymentsEdit | null;
  termsOrganizerId: string | null;
  canManage: boolean;
  actorUid: string;
  /** Moves to the page, or to one of its editors when given. */
  onOpen: (edit?: PaymentsEdit | null, organizerId?: string | null) => void;
  onBackToSettings: () => void;
  onError: (message: string | null) => void;
  onNotice: (message: string | null) => void;
}) {
  const terms = useCommercialTermsController({canManage, onError, onNotice, organizerId: null});
  const organizerTerms = useCommercialTermsController({canManage: canManage && termsOrganizerId !== null, onError, onNotice, organizerId: termsOrganizerId});
  const routing = usePaymentRoutingController({canManage, onError, onNotice});
  const money = usePaymentSettingsController();
  const plans = useOrganizerEntitlementController({actorUid, onError, onNotice});
  const budgets = useMessagingBudgetController({onError, onNotice});
  const [month] = useState(() => lastMonth(Date.now()));
  const ledger = useMutation({mutationFn: () => exportMoneyLedger(month.month)});
  const editing = edit === "terms" ? terms : edit === "organizer-terms" ? organizerTerms : null;
  useEffect(() => {
    if (editing && editing.loadState === "ready" && editing.listing?.platform && !editing.editor) editing.startEdit();
  }, [editing]);
  useEffect(() => {
    if (edit === "collection" && routing.policy && !routing.editor) routing.startEdit();
  }, [edit, routing]);
  const back = () => onOpen();
  const download = async () => {
    try {
      const result = await ledger.mutateAsync();
      const url = URL.createObjectURL(new Blob([result.csv], {type: "text/csv"}));
      const link = document.createElement("a");
      link.href = url;
      link.download = result.fileName;
      link.click();
      URL.revokeObjectURL(url);
      onNotice(`${result.fileName} downloaded: ${result.rowCount} rows for Zoho Books.`);
    } catch (error) {
      onError(error instanceof Error ? error.message : "The export could not be made.");
    }
  };
  return edit === "terms" ? renderTermsEditor(terms, back) :
    edit === "organizer-terms" ? renderTermsEditor(organizerTerms, back) :
      edit === "collection" ? renderRoutingEditor(routing, back) :
        edit === "credit" ? renderCreditEditor(money, back) :
          edit === "plans" ? renderPlansEditor(plans, back) :
            edit === "messaging" ? renderMessagingBudgetEditor(budgets, back) : (
          <>
            <CatchWorkspaceHeader back={{label: "Back to Settings", close: true, onPressed: onBackToSettings}} kicker="Settings" title="Payments" />
            {renderPaymentsOverview({
              terms, routing, money,
              isExporting: ledger.isPending,
              lastMonthLabel: month.label,
              onEdit: (next, organizerId) => onOpen(next, organizerId ?? null),
              onExport: () => void download(),
            })}
          </>
        );
}
