import {useEffect, useState} from "react";
import {nextPlan, splitPlans, type AccountPlan} from "./accountPageModel";
import {signedInHintKey, writeLocal} from "./signInModel";

export interface SiteAccountSummary {
  /** The account's display name, or empty when it has none yet. */
  name: string;
  phoneNumber: string | null;
  next: AccountPlan | null;
  upcoming: number;
}

/**
 * The signed-in top bar's account menu: who is signed in and their next
 * plan, from one manageWebsiteAccount read of the plans section while the
 * reader is signed in, and Sign out, which keeps the reader on the page.
 */
export function useSiteAccountMenuController(signedIn: boolean) {
  const [summary, setSummary] = useState<SiteAccountSummary | null>(null);
  useEffect(() => {
    if (!signedIn) {setSummary(null); return;}
    let cancelled = false;
    void (async () => {
      try {
        const {manageWebsiteAccount} = await import("../../firebase");
        const account = await manageWebsiteAccount({action: "read", sections: ["plans"]});
        const plans = account.plans ?? [];
        if (!cancelled) setSummary({name: account.displayName, phoneNumber: account.phoneNumber, next: nextPlan(plans),
          upcoming: splitPlans(plans).upcoming.filter((plan) => plan.status !== "cancelled").length});
      } catch {
        // The menu still offers My plans, Account and Sign out without the summary.
      }
    })();
    return () => {cancelled = true;};
  }, [signedIn]);
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
