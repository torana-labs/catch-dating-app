import {CatchButton, CatchField, CatchSheet, CatchStack, CatchText} from "@catch/web-ui";
import {claimFirebaseConfigured} from "../../firebaseConfig";
import {useEffect, useState} from "react";
import {signInCopy as copy} from "../../content/account";
import {Form} from "../../shared/ui/primitives";
import {emailForSignInKey, isMarkedEmailLinkReturn, readLocal, signedInHintKey, withoutEmailLinkParams, writeLocal} from "./signInModel";
import {useSignInSheetController, type SignInSheetController} from "./useSignInSheetController";

const noop = () => undefined;

/**
 * The one sign-in sheet (CatchSheet): phone code first, then Google and an
 * email link. It opens from the header and inline at the moment of need
 * (follow, book, review, claim) and never stands in front of browsing.
 */
function SignInSheet({open, onClose, onSignedIn, confirmEmail = false}: {
  open: boolean;
  onClose: () => void;
  onSignedIn?: () => void;
  /** A returned email link whose address this device does not hold. */
  confirmEmail?: boolean;
}) {
  const sheet = useSignInSheetController({onSignedIn: () => {onSignedIn?.(); onClose();}});
  useEffect(() => {
    if (open && confirmEmail) sheet.confirmEmail();
  }, [open, confirmEmail]);
  return <SignInSheetView onClose={() => {sheet.reset(); onClose();}} open={open} sheet={sheet} />;
}

export function SignInSheetView({open, onClose, sheet}: {open: boolean; onClose: () => void; sheet: SignInSheetController}) {
  return (
    <CatchSheet onClose={onClose} open={open} recipe="standard" subtitle={copy.subtitle} title={copy.title}>
      <CatchStack gap={16}>
        <SignInMethods sheet={sheet} />
        <CatchText as="p" role="status" tone={sheet.status.tone === "is-error" ? "danger" : "secondary"} variant="body-small">
          {sheet.status.message}
        </CatchText>
        <CatchStack id={sheet.recaptchaId} />
        <CatchText as="p" tone="secondary" variant="body-small">{copy.privacy}</CatchText>
      </CatchStack>
    </CatchSheet>
  );
}

function SignInMethods({sheet}: {sheet: SignInSheetController}) {
  const busy = sheet.pending ? "loading" : "idle";
  if (sheet.stage === "confirmEmail") {
    return (
      <Form noValidate onSubmit={sheet.finishEmail} pending={sheet.pending}>
        <CatchStack gap={12}>
          <CatchField autoComplete="email" keyboardType="emailAddress" onChanged={sheet.setEmail} recipe="input"
            title={copy.email} value={sheet.email} />
          <CatchButton fullWidth label={copy.finishEmail} onPressed={noop} status={busy} type="submit" />
        </CatchStack>
      </Form>
    );
  }
  if (sheet.stage === "linkSent") {
    return <CatchButton fullWidth label={copy.changePhone} onPressed={sheet.reset} variant="quiet" />;
  }
  if (sheet.stage === "code") {
    return (
      <Form noValidate onSubmit={sheet.verify} pending={sheet.pending}>
        <CatchStack gap={12}>
          <CatchField inputMode="inactive" keyboardType="phone" onChanged={noop} recipe="input" title={copy.phone} value={sheet.phone} />
          <CatchField autoComplete="one-time-code" inputMode={sheet.pending ? "inactive" : "editable"} keyboardType="number"
            maxLength={6} onChanged={sheet.setCode} recipe="input" title={copy.code} value={sheet.code} />
          <CatchButton fullWidth label={copy.verify} onPressed={noop} status={busy} type="submit" />
          <CatchButton fullWidth label={copy.changePhone} onPressed={sheet.pending ? null : sheet.changePhone} variant="quiet" />
        </CatchStack>
      </Form>
    );
  }
  return (
    <CatchStack gap={16}>
      <Form noValidate onSubmit={sheet.sendCode} pending={sheet.pending}>
        <CatchStack gap={12}>
          <CatchField autoComplete="tel" inputMode={sheet.pending ? "inactive" : "editable"} keyboardType="phone"
            onChanged={sheet.setPhone} recipe="input" title={copy.phone} value={sheet.phone} />
          <CatchButton fullWidth label={copy.sendCode} onPressed={noop} status={busy} type="submit" />
        </CatchStack>
      </Form>
      <CatchText align="center" as="p" tone="secondary" variant="label-kicker">{copy.or}</CatchText>
      <CatchButton fullWidth label={copy.google} onPressed={sheet.pending ? null : sheet.google} variant="secondary" />
      <Form noValidate onSubmit={sheet.sendLink} pending={sheet.pending}>
        <CatchStack gap={12}>
          <CatchField autoComplete="email" inputMode={sheet.pending ? "inactive" : "editable"} keyboardType="emailAddress"
            onChanged={sheet.setEmail} recipe="input" title={copy.email} value={sheet.email} />
          <CatchButton fullWidth label={copy.sendLink} onPressed={noop} status={busy} type="submit" variant="secondary" />
        </CatchStack>
      </Form>
    </CatchStack>
  );
}

/**
 * A quiet "Sign in" that opens the sheet in place: the header, the review
 * form and the inline account step use it. `label` names the button.
 */
export function SignInButton({label = copy.headerSignIn, onSignedIn, size = "sm", variant = "quiet"}: {
  label?: string;
  onSignedIn?: () => void;
  size?: "sm" | "md" | "lg";
  variant?: "quiet" | "secondary" | "primary";
}) {
  const [open, setOpen] = useState(false);
  return <>
    <CatchButton label={label} onPressed={() => setOpen(true)} size={size} variant={variant} />
    {open ? <SignInSheet onClose={() => setOpen(false)} onSignedIn={onSignedIn} open /> : null}
  </>;
}

/**
 * Finishes this sheet's email link when the reader comes back to the page:
 * with the address this device saved it signs in at once; otherwise it asks
 * for the address in the sheet. Other email links (public forms) are left alone.
 */
function useEmailLinkReturn(onSignedIn: () => void) {
  const [confirm, setConfirm] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !isMarkedEmailLinkReturn(window.location.href)) return;
    let cancelled = false;
    void (async () => {
      const {completeWebsiteAccountEmailLink, isWebsiteAccountEmailLink} = await import("../../firebase");
      if (cancelled || !await isWebsiteAccountEmailLink(window.location.href)) return;
      const saved = readLocal(emailForSignInKey);
      if (!saved) {if (!cancelled) setConfirm(true); return;}
      try {
        await completeWebsiteAccountEmailLink(saved, window.location.href);
        writeLocal(emailForSignInKey, null); writeLocal(signedInHintKey, "1");
        window.history.replaceState(window.history.state, "", withoutEmailLinkParams(window.location.href));
        if (!cancelled) onSignedIn();
      } catch {
        if (!cancelled) setConfirm(true);
      }
    })();
    return () => {cancelled = true;};
  }, []);
  return {confirm, dismiss: () => setConfirm(false)};
}

/**
 * The header's account entry: "Sign in" opens the sheet, and a signed-in
 * reader gets "Account". Firebase loads only for a reader this device has
 * seen signed in, or one coming back from an email link, so a first visit
 * pays nothing for it. It renders nothing until the browser has decided.
 */
export function SiteAccountAction() {
  const [state, setState] = useState<"pending" | "signedOut" | "signedIn">("pending");
  const [watch, setWatch] = useState(false);
  const [open, setOpen] = useState(false);
  const link = useEmailLinkReturn(() => setWatch(true));
  useEffect(() => {
    const hinted = readLocal(signedInHintKey) === "1" || isMarkedEmailLinkReturn(window.location.href);
    if (hinted) setWatch(true); else setState("signedOut");
  }, []);
  useEffect(() => {
    if (!watch) return;
    let stop: () => void = () => undefined;
    let cancelled = false;
    void import("../../firebase").then(({watchWebsiteAccountAuthState}) => {
      if (cancelled) return;
      stop = watchWebsiteAccountAuthState((user) => {
        setState(user ? "signedIn" : "signedOut");
        writeLocal(signedInHintKey, user ? "1" : null);
      });
    }).catch(() => setState("signedOut"));
    return () => {cancelled = true; stop();};
  }, [watch]);
  if (!claimFirebaseConfigured || state === "pending") return null;
  if (state === "signedIn") return <CatchButton href="/account/" label={copy.headerAccount} size="sm" variant="quiet" />;
  return <>
    <CatchButton label={copy.headerSignIn} onPressed={() => setOpen(true)} size="sm" variant="quiet" />
    {open || link.confirm ? <SignInSheet confirmEmail={link.confirm} onClose={() => {setOpen(false); link.dismiss();}}
      onSignedIn={() => setWatch(true)} open /> : null}
  </>;
}

/**
 * An optional sign-in at the moment of need, such as the review form: it
 * never blocks the action, it only says what signing in adds. A signed-in
 * reader sees `signedInNote` instead.
 */
export function SignInPrompt({note = copy.reviewPrompt, signedInNote = copy.reviewSignedIn}: {note?: string; signedInNote?: string}) {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  useEffect(() => {
    if (!claimFirebaseConfigured) return;
    let stop: () => void = () => undefined;
    let cancelled = false;
    void import("../../firebase").then(({watchWebsiteAccountAuthState}) => {
      if (!cancelled) stop = watchWebsiteAccountAuthState((user) => setSignedIn(Boolean(user)));
    }).catch(() => setSignedIn(false));
    return () => {cancelled = true; stop();};
  }, []);
  if (signedIn === null) return null;
  if (signedIn) return <CatchText as="p" tone="secondary" variant="body-small">{signedInNote}</CatchText>;
  return (
    <CatchStack align="center" direction="row" gap={8} wrap>
      <CatchText as="p" tone="secondary" variant="body-small">{note}</CatchText>
      <SignInButton />
    </CatchStack>
  );
}
