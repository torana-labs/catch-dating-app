import {
  CatchAvatar,
  CatchButton,
  CatchCodeInput,
  CatchField,
  CatchHeroImage,
  CatchIcon,
  CatchQrCode,
  CatchStack,
  CatchSurface,
  CatchText,
} from "@catch/web-ui";
import {organizerPageCopy as copy} from "../../../../content/organizerPage";
import {renderAccountForm} from "../../../account/accountForm";
import type {OrganizerPageController} from "../../useOrganizerPageController";

/**
 * The board's hero: a photo from a past event, or the organiser's format
 * colour where there is none yet.
 */
export function OrganizerCover({controller}: {controller: OrganizerPageController}) {
  const {header, name} = controller.view;
  return header.coverUrl ?
    <CatchHeroImage framed imageUrl={header.coverUrl} semanticLabel={header.coverAlt ?? copy.coverAlt(name)} showScrim={false} /> :
    <CatchSurface aria-hidden="true" aspect={1.95} block="spotlight" color={header.format} />;
}

/**
 * Who the organiser is, then follow and share: the top of the first phone
 * screen. The logo, the name with its verified mark, the headline, the place,
 * one line of numbers, and the two buttons.
 */
export function OrganizerIdentitySection({controller}: {controller: OrganizerPageController}) {
  const {follow, share, view} = controller;
  const {header} = view;
  const stats = header.stats.map((stat) => `${stat.value} ${stat.label}`).join(" · ");
  return (
    <CatchStack gap={20}>
      <CatchStack gap={12}>
        <CatchAvatar initials={header.monogram} name={view.name} size={72} />
        <CatchStack align="center" direction="row" gap={8}>
          <CatchText as="h1" variant="page-title">{view.name}</CatchText>
          {header.verified ? <CatchIcon label={copy.verifiedLabel} name="protected" size={24} /> : null}
        </CatchStack>
        {header.tag ? <CatchText tone="secondary" variant="label-kicker">{header.tag}</CatchText> : null}
        {header.headline ? <CatchText as="p" variant="body-lead">{header.headline}</CatchText> : null}
        {header.meta ? <CatchText as="p" tone="secondary" variant="body-small">{header.meta}</CatchText> : null}
        {stats ? <CatchText as="p" variant="label-action">{stats}</CatchText> : null}
      </CatchStack>
      <CatchStack gap={8}>
        <CatchStack direction="row" equal gap={8}>
          <CatchButton
            fill
            label={follow.following ? copy.following : copy.follow}
            onPressed={follow.press}
            status={follow.pending ? "loading" : "idle"}
            variant={follow.following ? "secondary" : "primary"}
          />
          <CatchButton fill label={copy.share} leadingIcon="share" onPressed={share.toggle} variant="secondary" />
        </CatchStack>
        {follow.byPhone ? <CatchText as="p" tone="secondary" variant="body-small">{copy.followNote}</CatchText> : null}
      </CatchStack>
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

/** Follow by phone (CAT-253): number, then code, then done. Hidden until its backend lands. */
function OrganizerFollowSheet({error, name, phone}: {error: string; name: string; phone: PhoneFollow}) {
  const sheet = copy.followSheet;
  if (phone.step === "done") {
    return (
      <CatchSurface role="status">
        <CatchText as="p" variant="title-row">{sheet.doneTitle(name)}</CatchText>
        <CatchText as="p" tone="secondary" variant="body-small">{sheet.doneBody}</CatchText>
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
      ) : (
        <CatchStack gap={8}>
          <CatchCodeInput
            contractExemption="Follow by phone has no callable contract until CAT-253 lands."
            onChanged={phone.setCode}
            onSubmitted={phone.confirm}
            semanticsLabel={sheet.codeBody(phone.shown)}
            status={error ? "error" : "ready"}
            value={phone.code}
          />
          {error ? <CatchText as="p" role="alert" tone="danger" variant="body-small">{error}</CatchText> : null}
        </CatchStack>
      )}
      <CatchButton
        fill
        label={phone.step === "phone" ? sheet.sendCode : sheet.confirm}
        onPressed={phone.step === "phone" ? phone.sendCode : phone.confirm}
        status={phone.pending ? "loading" : "idle"}
      />
    </CatchSurface>
  );
}
