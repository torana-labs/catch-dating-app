import {useQuery} from "@tanstack/react-query";
import {createContext, createElement, useContext, useEffect, useState, type ReactNode} from "react";
import {readLocal, signedInHintKey} from "../account/signInModel";
import {useSignInSheetController} from "../account/useSignInSheetController";
import {liveOwnedOrganizers, referralAccount, type ReferralAccountUser, type ReferralOwnedOrganizer} from "./referralAccountModel";

/** What the form reads about the visitor: the site's Firebase account unless a story or test provides another. */
export interface ReferralAccountDeps {
  /** Whether this device has been seen signed in; Firebase loads only then, or after a sign-in here. */
  readonly seenSignedIn: () => boolean;
  /** Calls back with the signed-in user (null when signed out) until stopped. */
  readonly watchUser: (callback: (user: ReferralAccountUser | null) => void) => () => void;
  /** The live host pages the signed-in account owns (the organizers rows host billing reads). */
  readonly ownedOrganizers: (uid: string) => Promise<ReferralOwnedOrganizer[]>;
}

const siteDeps: ReferralAccountDeps = {
  seenSignedIn: () => readLocal(signedInHintKey) === "1",
  watchUser(callback) {
    let stop: () => void = () => undefined;
    let cancelled = false;
    void import("../../firebase").then(({watchWebsiteAccountAuthState}) => {
      if (cancelled) return;
      stop = watchWebsiteAccountAuthState((user) => callback(user ? {uid: user.uid, phoneNumber: user.phoneNumber, isAnonymous: user.isAnonymous} : null));
    }).catch(() => {if (!cancelled) callback(null);});
    return () => {cancelled = true; stop();};
  },
  async ownedOrganizers(uid) {
    // The organizers rows the Host app reads; the form needs only the first answer.
    const {watchOwnedOrganizers} = await import("../../firebaseReadModels");
    return new Promise<ReferralOwnedOrganizer[]>((resolve, reject) => {
      let stop: (() => void) | null = null;
      let done = false;
      const finish = () => {
        done = true;
        stop?.();
      };
      watchOwnedOrganizers(uid, (rows) => {
        finish();
        resolve(liveOwnedOrganizers(rows));
      }, (error) => {
        finish();
        reject(error);
      }).then((unsubscribe) => {
        if (done) unsubscribe(); else stop = unsubscribe;
      }, reject);
    });
  },
};

const referralAccountDepsContext = createContext<ReferralAccountDeps>(siteDeps);

/** Gives the referral form inside `children` these dependencies (Storybook and tests answer them). */
export function provideReferralAccountDeps(deps: ReferralAccountDeps, children: ReactNode): ReactNode {
  return createElement(referralAccountDepsContext.Provider, {value: deps}, children);
}

/**
 * The /refer/ form's sign-in: who is signed in (signed out, checking, the
 * owner of a live host page, signed in without one, or unknown when the
 * owned pages cannot be read) and the site's one sign-in sheet, opened in
 * place. Like the header, it loads Firebase only for a device seen signed
 * in, or once someone signs in here. Nothing here goes with the lead: the
 * lead client sends the account's ID token itself, and the intake credits
 * whoever that token names.
 */
export function useReferralAccountController() {
  const deps = useContext(referralAccountDepsContext);
  const [watch, setWatch] = useState(false);
  const [identity, setIdentity] = useState<{user: ReferralAccountUser | null; loaded: boolean}>({user: null, loaded: false});
  const [signInOpen, setSignInOpen] = useState(false);
  useEffect(() => {
    if (deps.seenSignedIn()) setWatch(true); else setIdentity({user: null, loaded: true});
  }, [deps]);
  useEffect(() => {
    if (!watch) return;
    return deps.watchUser((user) => setIdentity({user, loaded: true}));
  }, [watch, deps]);
  const uid = identity.user && !identity.user.isAnonymous ? identity.user.uid : null;
  const owned = useQuery({queryKey: ["referral-account", uid, "organizers"], enabled: Boolean(uid), retry: false, gcTime: 0,
    queryFn: () => deps.ownedOrganizers(uid!)});
  const sheet = useSignInSheetController({onSignedIn: () => {setSignInOpen(false); setWatch(true);}});
  const account = referralAccount({loaded: identity.loaded, user: identity.user,
    ownership: owned.isPending ? "pending" : owned.isError ? "failed" : owned.data});
  return {
    account,
    /** The sign-in sheet's state, for the sheet the view draws. */
    sheet,
    signInOpen,
    toggleSignIn: () => setSignInOpen((open) => !open),
    closeSignIn: () => {sheet.reset(); setSignInOpen(false);},
  };
}
