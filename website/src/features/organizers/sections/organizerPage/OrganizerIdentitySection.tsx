import {
  CatchBadge,
  CatchButton,
  CatchCheckboxInput,
  CatchCodeInput,
  CatchField,
  CatchHeroImage,
  CatchProfileHeader,
  CatchQrCode,
  CatchStack,
  CatchSurface,
  CatchText,
} from "@catch/web-ui";
import {organizerPageCopy as copy} from "../../../../content/organizerPage";
import {renderAccountForm} from "../../../account/accountForm";
import type {OrganizerPageController} from "../../useOrganizerPageController";

/**
 * The cover on its own: a photo from a past event, or the organiser's
 * colour where there is none yet. The page no longer draws it apart from the
 * identity (CatchProfileHeader holds the cover now); it stays exported only
 * until design/website/components.json drops its organizer_cover entry.
 */
export function OrganizerCover({controller}: {controller: OrganizerPageController}) {
  const {header, name} = controller.view;
  return header.coverUrl ?
    <CatchHeroImage framed imageUrl={header.coverUrl} semanticLabel={header.coverAlt ?? copy.coverAlt(name)} showScrim={false} /> :
    <CatchSurface aria-hidden="true" aspect={1.95} block="spotlight" color={header.format} />;
}

/**
 * Who the organiser is, then follow and share: the top of the first phone
 * screen, as the board's rail opens. The cover and the logo, the name with
 * its verified seal, the generated page's tag, the headline, the place, one
 * line of numbers that each have data behind them, any labels the organiser
 * set, and the two buttons. The follow sheet and the share card open under
 * them.
 */
export function OrganizerIdentitySection({controller}: {controller: OrganizerPageController}) {
  const {follow, share, view} = controller;
  const {header} = view;
  const actions = (
    <CatchStack gap={12}>
      {header.labels.length ? (
        <CatchStack direction="row" gap={8} wrap>
          {header.labels.map((label) => <CatchBadge key={label} label={label} size="md" tone="brand" />)}
        </CatchStack>
      ) : null}
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
      {follow.byPhone ? <CatchText as="p" tone="secondary" variant="body-small">{copy.followNote}</CatchText> : null}
    </CatchStack>
  );
  return (
    <CatchStack gap={20}>
      <CatchProfileHeader
        actions={actions}
        coverAlt={header.coverUrl ? header.coverAlt ?? copy.coverAlt(view.name) : undefined}
        coverGround={header.accent}
        coverUrl={header.coverUrl}
        headline={header.headline || undefined}
        meta={header.meta || undefined}
        monogram={header.monogram}
        monogramGround={header.monogramGround}
        name={view.name}
        stats={header.stats}
        tag={header.tag}
        verifiedLabel={header.verified ? copy.verifiedLabel : undefined}
      />
      {follow.phone ? <OrganizerFollowSheet error={follow.error} name={view.name} phone={follow.phone} /> : null}
      {follow.account ? <CatchSurface>{renderAccountForm(follow.account)}</CatchSurface> : null}
      {!follow.phone && follow.error ? <CatchText as="p" role="alert" tone="danger" variant="body-small">{follow.error}</CatchText> : null}
      {share.open ? (
        <CatchSurface>
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
        </CatchSurface>
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
      <CatchSurface role="status">
        <CatchText as="p" variant="title-row">{sheet.doneTitle(name)}</CatchText>
        <CatchText as="p" tone="secondary" variant="body-small">{sheet.doneBody(phone.whatsapp)}</CatchText>
      </CatchSurface>
    );
  }
  return (
    <CatchSurface>
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
    </CatchSurface>
  );
}
