import {
  CatchBadge,
  CatchButton,
  CatchCheckboxInput,
  CatchCodeInput,
  CatchField,
  CatchGroundCard,
  CatchProfileHeader,
  CatchQrCode,
  CatchStack,
  CatchText,
} from "@catch/web-ui";
import {organizerPageCopy as copy} from "../../../../content/organizerPage";
import {renderAccountForm} from "../../../account/accountForm";
import type {OrganizerPageController} from "../../useOrganizerPageController";

/**
 * The hero across the content width (owner-approved layout, 17 Nov 2026):
 * the cover, a past event's photo or the organiser's colour, with the logo
 * over its foot; then the name with its verified seal, the generated page's
 * tag, the women-led label, the headline, the place, and one line of numbers
 * that each have data behind them on the left, and Follow and Share on the
 * right. A phone stacks the buttons under the numbers.
 */
export function OrganizerIdentitySection({controller}: {controller: OrganizerPageController}) {
  const {follow, share, view} = controller;
  const {header} = view;
  return (
    <CatchProfileHeader
      actions={(
        <CatchStack direction="row" equal gap={8}>
          <CatchButton
            fill
            label={follow.following ? copy.following : copy.follow}
            leadingIcon={follow.following ? "check" : undefined}
            onPressed={follow.press}
            status={follow.pending ? "loading" : "idle"}
            variant={follow.following ? "secondary" : "primary"}
          />
          <CatchButton fill label={copy.share} leadingIcon="share" onPressed={share.toggle} variant="secondary" />
        </CatchStack>
      )}
      badges={header.labels.length ? (
        <CatchStack direction="row" gap={8} wrap>
          {header.labels.map((label) => <CatchBadge key={label} label={label} size="md" tone="brand" />)}
        </CatchStack>
      ) : undefined}
      coverAlt={header.coverUrl ? header.coverAlt ?? copy.coverAlt(view.name) : undefined}
      coverGround={header.accent}
      coverUrl={header.coverUrl}
      headline={header.headline || undefined}
      layout="hero"
      meta={header.meta || undefined}
      monogram={header.monogram}
      monogramGround={header.monogramGround}
      name={view.name}
      stats={header.stats}
      tag={header.tag}
      verifiedLabel={header.verified ? copy.verifiedLabel : undefined}
    />
  );
}

/**
 * What Follow and Share open, at the top of the rail: the phone follow
 * sheet (or the account step), a follow error, and the share card with its
 * QR code. Nothing while both are closed.
 */
export function OrganizerFollowPanels({controller}: {controller: OrganizerPageController}) {
  const {follow, share, view} = controller;
  const followNote = follow.byPhone ? <CatchText as="p" tone="secondary" variant="body-small">{copy.followNote}</CatchText> : null;
  if (!followNote && !follow.phone && !follow.account && !follow.error && !share.open) return null;
  return (
    <CatchStack gap={12}>
      {followNote}
      {follow.phone ? <OrganizerFollowSheet error={follow.error} name={view.name} phone={follow.phone} /> : null}
      {follow.account ? <CatchGroundCard><CatchStack gap={12}>{renderAccountForm(follow.account)}</CatchStack></CatchGroundCard> : null}
      {!follow.phone && follow.error ? <CatchText as="p" role="alert" tone="danger" variant="body-small">{follow.error}</CatchText> : null}
      {share.open ? (
        <CatchGroundCard><CatchStack gap={12}>
          <CatchStack align="center" direction="row" gap={16}>
            <CatchQrCode label={copy.qrLabel(share.displayUrl)} size="m" value={share.url} />
            <CatchStack gap={8}>
              <CatchText as="p" tone="secondary" variant="body-small">{copy.shareCaption}</CatchText>
              <CatchText as="p" variant="title-row">{share.displayUrl}</CatchText>
              <CatchStack align="start">
                <CatchButton label={share.copyState === "copied" ? copy.copied : copy.copyLink} onPressed={share.copy} size="md" />
              </CatchStack>
              {share.copyState === "failed" ? <CatchText as="p" role="alert" tone="danger" variant="body-small">{copy.copyFailed}</CatchText> : null}
            </CatchStack>
          </CatchStack>
        </CatchStack></CatchGroundCard>
      ) : null}
    </CatchStack>
  );
}

type PhoneFollow = NonNullable<OrganizerPageController["follow"]["phone"]>;

/** Follow by phone (CAT-253): number and the WhatsApp tick, then code, then done. */
function OrganizerFollowSheet({error, name, phone}: {error: string; name: string; phone: PhoneFollow}) {
  const sheet = copy.followSheet;
  if (phone.step === "done") {
    return (
      <CatchGroundCard role="status"><CatchStack gap={6}>
        <CatchText as="p" variant="title-row">{sheet.doneTitle(name)}</CatchText>
        <CatchText as="p" tone="secondary" variant="body-small">{sheet.doneBody(phone.whatsapp)}</CatchText>
      </CatchStack></CatchGroundCard>
    );
  }
  return (
    <CatchGroundCard><CatchStack gap={12}>
      <CatchStack gap={4}>
        <CatchText as="p" variant="title-row">{phone.step === "phone" ? sheet.phoneTitle : sheet.codeTitle}</CatchText>
        <CatchText as="p" tone="secondary" variant="body-small">{phone.step === "phone" ? sheet.phoneBody(name) : sheet.codeBody(phone.shown)}</CatchText>
      </CatchStack>
      {phone.step === "phone" ? (
        <CatchStack gap={12}>
        <CatchField
          autoComplete="tel-national"
          errorText={error || null}
          inputHint={sheet.phonePlaceholder}
          inputMode={phone.pending ? "inactive" : "editable"}
          keyboardType="phone"
          onChanged={phone.setNumber}
          onSubmitted={phone.sendCode}
          prefixText="+91"
          recipe="input"
          title={sheet.phoneLabel}
          value={phone.number}
        />
        <CatchCheckboxInput label={sheet.whatsappTick}
          onChanged={phone.pending ? null : phone.setWhatsapp} value={phone.whatsapp} />
        </CatchStack>
      ) : (
        <CatchStack gap={8}>
          <CatchCodeInput
            contractExemption="The phone code is Firebase Auth's sign-in code, not a callable field."
            onChanged={phone.setCode}
            onSubmitted={phone.confirm}
            semanticsLabel={sheet.codeBody(phone.shown)}
            status={error ? "error" : "ready"}
            value={phone.code}
          />
          {error ? <CatchText as="p" role="alert" tone="danger" variant="body-small">{error}</CatchText> : null}
        </CatchStack>
      )}
      <CatchStack id={phone.recaptchaId} />
      <CatchButton
        fill
        label={phone.step === "phone" ? sheet.sendCode : sheet.confirm}
        onPressed={phone.step === "phone" ? phone.sendCode : phone.confirm}
        status={phone.pending ? "loading" : "idle"}
      />
    </CatchStack></CatchGroundCard>
  );
}
