import {useEffect, useState} from "react";
import {
  accountFollows,
  accountPlans,
  accountReviews,
  organizerIdsOf,
  type AccountFollow,
  type AccountPlan,
  type AccountReview,
  type AccountRow,
} from "./accountRows";

/** The account page's listener-read sections. */
export interface OwnAccountSections {
  plans: AccountPlan[];
  follows: AccountFollow[];
  reviews: AccountReview[];
}

/**
 * Listens to the signed-in guest's own plans, follows and reviews while
 * `uid` is set, and names their organizers from the public copies (read once
 * per organizer). Undefined until the first rows arrive, and after an error,
 * which is reported instead; a sign-out or account change drops everything.
 */
export function useOwnAccountRows(uid: string | null, enabled = true): {
  sections: OwnAccountSections | undefined; error: Error | null;
} {
  const [state, setState] = useState<{uid: string; sections: OwnAccountSections} | null>(null);
  const [error, setError] = useState<Error | null>(null);
  useEffect(() => {
    setState(null); setError(null);
    if (!uid || !enabled) return undefined;
    let live = true;
    let stop: () => void = () => undefined;
    const names = new Map<string, Record<string, unknown>>();
    const known = new Set<string>();
    let latest: {plans: AccountRow[]; follows: AccountRow[]; reviews: AccountRow[]} | null = null;
    const compose = () => {
      if (!live || !latest) return;
      setState({uid, sections: {
        plans: accountPlans(latest.plans, names, uid, Date.now()),
        follows: accountFollows(latest.follows, names, uid),
        reviews: accountReviews(latest.reviews, names, uid),
      }});
    };
    void import("../../firebaseReadModels").then(async ({readPublicOrganizers, watchOwnAccountRows}) => {
      const stopWatching = await watchOwnAccountRows(uid, (rows) => {
        latest = rows;
        const missing = organizerIdsOf(rows.plans, rows.follows, rows.reviews).filter((id) => !known.has(id));
        if (!missing.length) {compose(); return;}
        missing.forEach((id) => known.add(id));
        void readPublicOrganizers(missing).then((found) => {
          found.forEach((data, id) => names.set(id, data));
          compose();
        }, () => compose());
      }, (failure) => {if (live) {setState(null); setError(failure);}});
      if (live) stop = stopWatching; else stopWatching();
    }).catch((failure: unknown) => {
      if (live) setError(failure instanceof Error ? failure : new Error(String(failure)));
    });
    return () => {live = false; stop();};
  }, [uid, enabled]);
  return {sections: state && state.uid === uid ? state.sections : undefined, error};
}
