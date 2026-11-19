import {CatchButton, CatchStack, CatchText} from "@catch/web-ui";
import type {ReactNode} from "react";
import {interpolateContent as fill} from "@content/interpolate";
import {referralSignInCopy as copy} from "@content/referral";
import {SignInSheetView} from "../account/SignInSheet";
import {useReferralAccountController} from "./useReferralAccountController";

/**
 * Above the referral form's fields: signed out, what credit needs and
 * "Sign in with your Catch Host number", which opens the site's sign-in
 * sheet in place; signed in, "Signed in as …" and whether the referral is
 * credited. Nothing shows until the browser has decided who is signed in.
 */
function ReferralSignIn() {
  const controller = useReferralAccountController();
  const {account} = controller;
  if (account.status === "checking") return null;
  if (account.status === "signedOut") {
    return (
      <CatchStack align="start" gap={8}>
        <CatchText as="p" tone="secondary" variant="body-small">{copy.signedOut}</CatchText>
        <SignInSheetView onClose={controller.closeSignIn} open={controller.signInOpen} sheet={controller.sheet}
          trigger={<CatchButton label={copy.signIn} leadingIcon="person" onPressed={controller.toggleSignIn} size="sm" variant="secondary" />} />
      </CatchStack>
    );
  }
  return (
    <CatchStack aria-live="polite" gap={4} role="status">
      <CatchText as="p" variant="body">{fill(copy.signedInAs, {name: account.name ?? copy.fallbackName})}</CatchText>
      <CatchText as="p" tone="secondary" variant="body-small">{copy[account.status]}</CatchText>
    </CatchStack>
  );
}

/**
 * The /refer/ form's sign-in, which the playbook's referral slot puts above
 * the lead form (features/playbook/playbookLeadForms.ts). Signed in or not,
 * the form sends; the lead client adds the signed-in account's ID token to a
 * referral, and the intake credits whoever it names
 * (shared/api/websiteLead.ts).
 */
export function referralSignInNode(): ReactNode {
  return <ReferralSignIn />;
}
