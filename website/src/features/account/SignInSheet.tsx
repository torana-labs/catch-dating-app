import {CatchAdaptiveSheet, CatchButton, CatchField, CatchStack, CatchText, useCatchAdaptiveSheetAnchor} from "@catch/web-ui";
import {claimFirebaseConfigured} from "../../firebaseConfig";
import {useEffect, useMemo, useState, type ReactNode, type RefObject} from "react";
import {signInCopy as copy} from "../../content/account";
import {SiteAccountActionProvider, type SiteAccountEntry} from "../../shared/site";
import {Form} from "../../shared/ui/primitives";
import {readLocal, signedInHintKey, writeLocal} from "./signInModel";
import {SiteAccountMenu} from "./SiteAccountMenu";
import {useSignInSheetController, type SignInSheetController} from "./useSignInSheetController";
import {useSiteAccountMenuController} from "./useSiteAccountMenuController";

const noop = () => undefined;

/**
 * The one sign-in sheet, as in the apps: a phone number, then a six-digit
 * code. It opens from the header and inline at the moment of need (follow,
 * book, review, claim) and never stands in front of browsing. On phones it
 * is a bottom sheet; at 900px and wider it drops down, 380px, under the
 * control that opened it. The number stays until sign-in finishes.
 */
function SignInSheet({open, onClose, onSignedIn, anchor, trigger}: {
  open: boolean;
  onClose: () => void;
  onSignedIn?: () => void;
  /** The control the wide dropdown hangs from, when it is drawn elsewhere. */
  anchor?: RefObject<HTMLElement | null>;
  /** The control that opens it, drawn in place. */
  trigger?: ReactNode;
}) {
  const sheet = useSignInSheetController({onSignedIn: () => {onSignedIn?.(); onClose();}});
  return <SignInSheetView anchor={anchor} onClose={() => {sheet.reset(); onClose();}} open={open} sheet={sheet} trigger={trigger} />;
}

export function SignInSheetView({open, onClose, sheet, anchor, trigger}: {
  open: boolean;
  onClose: () => void;
  sheet: SignInSheetController;
  anchor?: RefObject<HTMLElement | null>;
  trigger?: ReactNode;
}) {
  return (
    <CatchAdaptiveSheet anchor={anchor} closeLabel={copy.close} onClose={onClose} open={open} subtitle={copy.subtitle} title={copy.title}
      footer={<CatchText as="p" tone="secondary" variant="body-small">{copy.privacy}</CatchText>} trigger={trigger} wide="dropdown" width={380}>
      <CatchStack gap={12}>
        <SignInSteps sheet={sheet} />
        <CatchText as="p" role="status" tone={sheet.status.tone === "is-error" ? "danger" : "secondary"} variant="body-small">
          {sheet.status.message}
        </CatchText>
        <CatchStack id={sheet.recaptchaId} />
      </CatchStack>
    </CatchAdaptiveSheet>
  );
}

function SignInSteps({sheet}: {sheet: SignInSheetController}) {
  const busy = sheet.pending ? "loading" : "idle";
  if (sheet.stage === "code") {
    return (
      <Form noValidate onSubmit={sheet.verify} pending={sheet.pending}>
        <CatchStack gap={12}>
          <CatchField inputMode="inactive" keyboardType="phone" onChanged={noop} recipe="input" title={copy.phone} value={sheet.phone} />
          <CatchField autoComplete="one-time-code" inputMode={sheet.pending ? "inactive" : "editable"} keyboardType="number"
            onChanged={sheet.setCode} recipe="input" title={copy.code} value={sheet.code} />
          <CatchButton fullWidth label={copy.verify} onPressed={noop} status={busy} type="submit" />
          <CatchButton fullWidth label={copy.changePhone} onPressed={sheet.pending ? null : sheet.changePhone} variant="quiet" />
        </CatchStack>
      </Form>
    );
  }
  return (
    <Form noValidate onSubmit={sheet.sendCode} pending={sheet.pending}>
      <CatchStack gap={12}>
        <CatchField autoComplete="tel" inputMode={sheet.pending ? "inactive" : "editable"} keyboardType="phone"
          onChanged={sheet.setPhone} recipe="input" title={copy.phone} value={sheet.phone} />
        <CatchButton fullWidth label={copy.sendCode} onPressed={noop} status={busy} type="submit" />
        <CatchText align="center" as="p" variant="body-small">{copy.noPasswords}</CatchText>
      </CatchStack>
    </Form>
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
  return <SignInSheet onClose={() => setOpen(false)} onSignedIn={onSignedIn} open={open}
    trigger={<CatchButton label={label} onPressed={() => setOpen((value) => !value)} size={size} variant={variant} />} />;
}

/**
 * The header's account entry, provided to the public header. Signed out,
 * "Sign in" opens the sheet: wide pages draw it as the last item of the top
 * bar's left group, and the sign-in dropdown hangs from it; under 600px it
 * joins the phone menu. Signed in, wide pages draw the initials avatar that
 * opens the account menu, and phones get a Menu button carrying the avatar
 * that opens the same menu, with the links, as a sheet.
 * One state and one sheet serve both, and the sheet stays mounted while
 * signed out so a typed number survives closing it. Firebase loads only for
 * a reader this device has seen signed in, so a first visit pays nothing for
 * it; there is no entry until the browser has decided.
 */
export function SiteAccountProvider({children}: {children: ReactNode}) {
  const [state, setState] = useState<"pending" | "signedOut" | "signedIn">("pending");
  const [watch, setWatch] = useState(false);
  const [open, setOpen] = useState(false);
  const {anchor, wrap} = useCatchAdaptiveSheetAnchor();
  const menu = useSiteAccountMenuController(state === "signedIn");
  useEffect(() => {
    if (readLocal(signedInHintKey) === "1") setWatch(true); else setState("signedOut");
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
  const entry = useMemo<SiteAccountEntry | null>(() => {
    if (!claimFirebaseConfigured || state === "pending") return null;
    if (state === "signedIn") {
      return {barEnd: <SiteAccountMenu controller={menu} />,
        menu: {label: copy.headerAccount, href: "/account/"},
        phoneMenu: (links, menuLabel) => <SiteAccountMenu controller={menu} links={links} menuLabel={menuLabel} phone />};
    }
    return {bar: wrap(<CatchButton label={copy.headerSignIn} onPressed={() => setOpen((value) => !value)} size="sm" variant="quiet" />),
      menu: {label: copy.headerSignIn, onPressed: () => setOpen(true)}};
  }, [state, wrap, menu]);
  return (
    <SiteAccountActionProvider value={entry}>
      {children}
      {entry && state === "signedOut" ? <SignInSheet anchor={anchor} onClose={() => setOpen(false)}
        onSignedIn={() => setWatch(true)} open={open} /> : null}
    </SiteAccountActionProvider>
  );
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
