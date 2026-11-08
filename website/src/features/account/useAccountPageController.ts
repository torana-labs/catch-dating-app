import {useEffect, useState, type FormEvent} from "react";
import {interpolateContent as fill} from "@content/interpolate";
import {accountPageCopy as copy} from "../../content/account";
import type {FormStatus} from "../../shared/forms/types";
import {
  accountExport,
  accountSections,
  passPayload,
  requestId,
  tabFromHash,
  type AccountMessages,
  type AccountPlan,
  type AccountTab,
} from "./accountPageModel";
import {signedInHintKey, writeLocal} from "./signInModel";
import {useWebsiteAccountController, type WebsiteAccountController} from "./useWebsiteAccountController";

export type AccountPass =
  | {plan: AccountPlan; state: "loading"}
  | {plan: AccountPlan; state: "ready"; payload: string}
  | {plan: AccountPlan; state: "failed"};
const quiet: FormStatus = {message: "", tone: ""};

/**
 * The /account/ page: one manageWebsiteAccount read of the signed-in UID's
 * own sections, the tab in the URL fragment, and each tab's write through
 * the existing command (follow, WhatsApp withdrawal, account completion).
 */
export function useAccountPageController() {
  const base = useWebsiteAccountController({sections: accountSections});
  const [tab, setTabState] = useState<AccountTab>("plans");
  const [pass, setPass] = useState<AccountPass | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<FormStatus>(quiet);
  const [detailsStatus, setDetailsStatus] = useState<FormStatus>(quiet);
  useEffect(() => {
    setTabState(tabFromHash(window.location.hash));
    const changed = () => setTabState(tabFromHash(window.location.hash));
    window.addEventListener("hashchange", changed);
    return () => window.removeEventListener("hashchange", changed);
  }, []);
  function setTab(value: string) {
    const next = tabFromHash(value);
    setTabState(next); setNotice(quiet);
    window.history.replaceState(window.history.state, "", `${window.location.pathname}${window.location.search}#${next}`);
  }
  async function write(key: string, work: () => Promise<void>, failed: string, done?: string) {
    if (busy) return;
    setBusy(key); setNotice(quiet);
    try {
      await work();
      await base.refresh();
      if (done) setNotice({message: done, tone: "is-success"});
    } catch {
      setNotice({message: failed, tone: "is-error"});
    } finally {setBusy(null);}
  }
  const uid = base.uid;
  const account = base.account;
  return {
    phase: base.loading ? "loading" as const : !uid ? "signedOut" as const :
      !account ? "failed" as const : "ready" as const,
    account,
    tab, setTab, notice, busy,
    refresh: () => void base.refresh(),
    unfollow: (organizerId: string) => uid ? write(`follow:${organizerId}`, async () => {
      const {setWebsiteOrganizerFollow} = await import("../../firebase");
      await setWebsiteOrganizerFollow(organizerId, false, uid);
    }, copy.following.failed) : undefined,
    stopWhatsapp: (row: AccountMessages) => write(`whatsapp:${row.organizerId}`, async () => {
      const {withdrawWebsiteMessagingPermission} = await import("../../firebase");
      await withdrawWebsiteMessagingPermission({scope: "organizer", organizerId: row.organizerId,
        expectedReceiptId: row.whatsappReceiptId, requestId: requestId()});
    }, copy.messages.failed, fill(copy.messages.stopped, {organizer: row.organizerName})),
    pass,
    openPass: async (plan: AccountPlan) => {
      setPass({plan, state: "loading"});
      try {
        const {getWebsiteEventTicketCode} = await import("../../firebase");
        const ticket = await getWebsiteEventTicketCode(plan.eventId);
        setPass((current) => current?.plan.eventId === plan.eventId ?
          {plan, state: "ready", payload: passPayload(ticket.eventId, ticket.ticketCode)} : current);
      } catch {
        setPass((current) => current?.plan.eventId === plan.eventId ? {plan, state: "failed"} : current);
      }
    },
    closePass: () => setPass(null),
    details: detailsFor(base, detailsStatus, setDetailsStatus),
    download: () => {
      if (!account) return;
      const url = URL.createObjectURL(new Blob([accountExport(account, new Date())], {type: "application/json"}));
      const link = document.createElement("a");
      link.href = url; link.download = copy.privacy.downloadFile;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 0);
    },
    signOut: async () => {
      const {signOutWebsiteAccount} = await import("../../firebase");
      await signOutWebsiteAccount();
      writeLocal(signedInHintKey, null);
    },
    accountStep: base,
  };
}
export type AccountPageController = ReturnType<typeof useAccountPageController>;

/** Details save the name and an optional birth date through account completion; the phone stays Firebase's. */
function detailsFor(base: WebsiteAccountController, status: FormStatus, setStatus: (status: FormStatus) => void) {
  const account = base.account;
  return {
    name: base.displayName, setName: base.setDisplayName,
    birth: base.dateOfBirth, setBirth: base.setDateOfBirth,
    phone: account?.phoneNumber ?? null,
    needsPhone: Boolean(account && (!account.phoneNumber || !account.accountReady)),
    status,
    save: async (event?: FormEvent) => {
      event?.preventDefault();
      if (!account || !base.uid) return;
      const displayName = base.displayName.trim();
      if (!displayName) {setStatus({message: copy.details.failed, tone: "is-error"}); return;}
      setStatus(quiet);
      try {
        const {manageWebsiteAccount} = await import("../../firebase");
        await manageWebsiteAccount({action: "complete", displayName, expectedUid: base.uid,
          expectedProfileRevision: account.profileRevision,
          ...(base.dateOfBirth && base.dateOfBirth !== account.dateOfBirth ? {dateOfBirth: base.dateOfBirth} : {})});
        await base.refresh();
        setStatus({message: copy.details.saved, tone: "is-success"});
      } catch {
        setStatus({message: copy.details.failed, tone: "is-error"});
      }
    },
  };
}
