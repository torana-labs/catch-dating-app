import {useEffect, useState} from "react";
import {nextPlan, splitPlans, type AccountPlan} from "./accountPageModel";
import {signedInHintKey, writeLocal} from "./signInModel";
import {useOwnAccountRows} from "./useOwnAccountRows";

export interface SiteAccountSummary {
  /** The account's display name, or empty when it has none yet. */
  name: string;
  phoneNumber: string | null;
  next: AccountPlan | null;
  upcoming: number;
}

/**
 * The signed-in top bar's account menu: who is signed in, from one identity
 * read of the account, and their next plan, from the listener on their own
 * event rows, while the reader is signed in; and Sign out, which keeps the
 * reader on the page.
 */
export function useSiteAccountMenuController(signedIn: boolean) {
  const [identity, setIdentity] = useState<{uid: string; name: string; phoneNumber: string | null} | null>(null);
  useEffect(() => {
    if (!signedIn) {setIdentity(null); return;}
    let cancelled = false;
    void (async () => {
      try {
        const {manageWebsiteAccount} = await import("../../firebase");
        const account = await manageWebsiteAccount({action: "read"});
        if (!cancelled) setIdentity({uid: account.uid, name: account.displayName, phoneNumber: account.phoneNumber});
      } catch {
        // The menu still offers My plans, Account and Sign out without the summary.
      }
    })();
    return () => {cancelled = true;};
  }, [signedIn]);
  const {sections} = useOwnAccountRows(signedIn ? identity?.uid ?? null : null);
  const plans = sections?.plans;
  const summary: SiteAccountSummary | null = signedIn && identity && plans ? {
    name: identity.name, phoneNumber: identity.phoneNumber, next: nextPlan(plans),
    upcoming: splitPlans(plans).upcoming.filter((plan) => plan.status !== "cancelled").length,
  } : null;
  return {
    summary,
    signOut: async () => {
      const {signOutWebsiteAccount} = await import("../../firebase");
      await signOutWebsiteAccount();
      writeLocal(signedInHintKey, null);
    },
  };
}
export type SiteAccountMenuController = ReturnType<typeof useSiteAccountMenuController>;
