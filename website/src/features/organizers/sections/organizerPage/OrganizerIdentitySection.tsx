import {
  CatchButton,
  CatchCodeInput,
  CatchField,
  CatchGap,
  CatchGrid,
  CatchGroundCard,
  CatchIcon,
  CatchProfileHeader,
  CatchQrCode,
  CatchText,
} from "@catch/web-ui";
import {organizerPageCopy as copy} from "../../../../content/organizerPage";
import {renderAccountForm} from "../../../account/accountForm";
import type {OrganizerPageController} from "../../useOrganizerPageController";

/** Who the organiser is, then follow and share: the top of the first phone screen. */
export function OrganizerIdentitySection({controller}: {controller: OrganizerPageController}) {
  const {follow, share, view} = controller;
  const {header} = view;
  return (
    <CatchGap size="related">
      <CatchProfileHeader
        actions={(
          <CatchGrid columns={2} compactColumns={2} gap="inline">
            <CatchButton
              fullWidth
              label={follow.following ? copy.following : copy.follow}
              onPressed={follow.press}
              status={follow.pending ? "loading" : "idle"}
              variant={follow.following ? "secondary" : "primary"}
            />
            <CatchButton
              fullWidth
              label={copy.share}
              leading={<CatchIcon icon="share" size="md" />}
              onPressed={share.toggle}
              variant="secondary"
            />
          </CatchGrid>
        )}
        coverAlt={header.coverAlt}
        coverGround={header.accent}
        coverUrl={header.coverUrl}
        headline={header.headline}
        meta={header.meta}
        monogram={header.monogram}
        monogramGround={header.monogramGround}
        name={view.name}
        stats={header.stats}
        tag={header.tag}
        verifiedLabel={header.verified ? copy.verifiedLabel : undefined}
      />
      {follow.phone ? <OrganizerFollowSheet name={view.name} phone={follow.phone} error={follow.error} /> : null}
      {follow.account ? renderAccountForm(follow.account) : null}
      {!follow.phone && follow.error ? <CatchText color="danger" role="alert" variant="bodyS">{follow.error}</CatchText> : null}
      {share.open ? (
        <CatchGroundCard>
          <CatchGap crossAxisAlignment="center" direction="horizontal" size="formField">
            <CatchQrCode label={copy.qrLabel(share.displayUrl)} size="m" value={share.url} />
            <CatchGap size="inline">
              <CatchText color="ink2" variant="bodyM">{copy.shareCaption}</CatchText>
              <CatchText variant="sectionTitle">{share.displayUrl}</CatchText>
              <CatchGap crossAxisAlignment="start" size="inline">
                <CatchButton label={share.copyState === "copied" ? copy.copied : copy.copyLink} onPressed={share.copy} size="md" />
              </CatchGap>
              {share.copyState === "failed" ? <CatchText color="danger" role="alert" variant="bodyS">{copy.copyFailed}</CatchText> : null}
            </CatchGap>
          </CatchGap>
        </CatchGroundCard>
      ) : null}
    </CatchGap>
  );
}

type PhoneFollow = NonNullable<OrganizerPageController["follow"]["phone"]>;

/** Follow by phone (CAT-253): number, then code, then done. Hidden until its backend lands. */
function OrganizerFollowSheet({error, name, phone}: {error: string; name: string; phone: PhoneFollow}) {
  const sheet = copy.followSheet;
  if (phone.step === "done") {
    return (
      <CatchGroundCard>
        <CatchGap role="status" size="inline">
          <CatchText variant="sectionTitle">{sheet.doneTitle(name)}</CatchText>
          <CatchText color="ink2" variant="bodyM">{sheet.doneBody}</CatchText>
        </CatchGap>
      </CatchGroundCard>
    );
  }
  return (
    <CatchGroundCard>
      <CatchGap size="related">
        <CatchGap size="headerTitleToSubtitle">
          <CatchText variant="sectionTitle">{phone.step === "phone" ? sheet.phoneTitle : sheet.codeTitle}</CatchText>
          <CatchText color="ink2" variant="bodyM">{phone.step === "phone" ? sheet.phoneBody(name) : sheet.codeBody(phone.shown)}</CatchText>
        </CatchGap>
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
          <CatchGap size="inline">
            <CatchCodeInput
              contractExemption="Follow by phone has no callable contract until CAT-253 lands."
              onChanged={phone.setCode}
              onSubmitted={phone.confirm}
              semanticsLabel={sheet.codeBody(phone.shown)}
              status={error ? "error" : "ready"}
              value={phone.code}
            />
            {error ? <CatchText color="danger" role="alert" variant="bodyS">{error}</CatchText> : null}
          </CatchGap>
        )}
        <CatchButton
          fullWidth
          label={phone.step === "phone" ? sheet.sendCode : sheet.confirm}
          onPressed={phone.step === "phone" ? phone.sendCode : phone.confirm}
          status={phone.pending ? "loading" : "idle"}
        />
      </CatchGap>
    </CatchGroundCard>
  );
}
