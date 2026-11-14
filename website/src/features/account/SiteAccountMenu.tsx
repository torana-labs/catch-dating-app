import {CatchAccountButton, CatchAdaptiveSheet, CatchAvatar, CatchButton, CatchIndexRow, CatchSection, CatchStack} from "@catch/web-ui";
import {useState} from "react";
import {interpolateContent as fill} from "@content/interpolate";
import {signInCopy} from "../../content/account";
import {dateTile, passHref, whenLabel} from "./accountPageModel";
import type {SiteAccountMenuController} from "./useSiteAccountMenuController";

const copy = signInCopy.menu;
const plansHref = "/account/#plans";
const detailsHref = "/account/#details";
type Link = {label: string; href: string};

function nameOf(controller: SiteAccountMenuController) {
  return controller.summary?.name.trim() || copy.fallbackName;
}

/**
 * The signed-in account menu (Website account proposal, AcctBarMenuOpen1440
 * and AcctBarMenuOpen390): who is signed in, the next plan with View pass,
 * then My plans, Account and Sign out, and on phones the site links. Wide
 * pages open it from a 32px initials avatar as a 320px dropdown; phones open
 * it as a sheet from the Menu button, which carries the avatar.
 */
export function SiteAccountMenu({controller, phone, links = [], menuLabel}: {
  controller: SiteAccountMenuController;
  /** The phone Menu button and sheet, with the site links; otherwise the wide avatar. */
  phone?: boolean;
  links?: readonly Link[];
  menuLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const name = nameOf(controller);
  const summary = controller.summary;
  const trigger = phone ? (
    <CatchButton label={menuLabel ?? copy.label} leading={<CatchAvatar name={name} size={24} />} onPressed={() => setOpen((value) => !value)}
      semanticsLabel={fill(copy.phoneLabel, {name})} size="sm" variant="secondary" />
  ) : (
    <CatchAccountButton expanded={open} label={fill(copy.avatarLabel, {name})} name={name} onPressed={() => setOpen((value) => !value)} />
  );
  return (
    <CatchAdaptiveSheet align="end" closeLabel={signInCopy.close} onClose={() => setOpen(false)} open={open}
      subtitle={summary?.phoneNumber ?? undefined} title={name} trigger={trigger} wide="dropdown" width={320}>
      <CatchStack gap={12}>
        {summary?.next ? (
          <CatchSection container="tile" kicker={copy.nextPlan}>
            <CatchIndexRow date={dateTile(summary.next.startsAt)} density="compact"
              meta={[whenLabel(summary.next.startsAt), summary.next.venue].filter(Boolean).join(" · ")} title={summary.next.eventName} wrap
              footer={<CatchButton href={passHref(summary.next.eventId)} label={copy.viewPass} leadingIcon="ticket" size="sm" variant="secondary" />} />
          </CatchSection>
        ) : null}
        <CatchSection dividers="none">
          <CatchIndexRow density="regular" href={plansHref} icon="ticket" title={copy.myPlans}
            value={summary?.upcoming ? fill(copy.upcoming, {count: String(summary.upcoming)}) : undefined} />
          <CatchIndexRow density="regular" href={detailsHref} icon="person" title={copy.account} />
          <CatchIndexRow density="regular" icon="signOut" onTap={() => {setOpen(false); void controller.signOut();}} title={copy.signOut} />
        </CatchSection>
        {links.length > 0 ? (
          <CatchSection dividers="none">
            {links.map((link) => <CatchIndexRow density="regular" href={link.href} key={link.href} title={link.label} />)}
          </CatchSection>
        ) : null}
      </CatchStack>
    </CatchAdaptiveSheet>
  );
}
