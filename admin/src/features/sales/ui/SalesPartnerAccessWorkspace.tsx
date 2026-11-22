import {CatchButton, CatchCheckboxInput, CatchChoiceTile, CatchField, CatchGap, CatchIndexRow, CatchSheet, CatchLegacyText} from "@catch/web-ui";
import {useState} from "react";
import {useAdminOperationPending} from "../../../shared/pendingOperation";
import type {PartnerAccess} from "../api/salesPartnerAccess";
import {useSalesPartnerAccessController, type PartnerRevokeScope} from "../controllers/useSalesPartnerAccessController";
import {useSalesPartnerOfferController} from "../controllers/useSalesPartnerOfferController";

const day = (value: string) => new Date(value).toLocaleDateString("en-IN", {day: "numeric", month: "short"});

function partnerName(access: PartnerAccess): string {
  const uid = access.assignment?.partnerUid ?? "";
  return access.membership?.displayName.trim() || `account ${uid}`;
}

/** What the host's partner row says, and whether the host can be offered or revoked now. */
function rowState(access: PartnerAccess): {subtitle: string; live: boolean} {
  const {assignment, membership} = access;
  if (!assignment) return {subtitle: "Not offered", live: false};
  const name = partnerName(access);
  const ended = membership?.state === "revoked" ? " · their partner account is revoked" :
    membership?.state === "expired" ? " · their partner account has lapsed" : "";
  switch (assignment.state) {
  case "offered": return {subtitle: `Offered to ${name}, open until ${day(assignment.expiresAt)}${ended}`, live: true};
  case "accepted": return {subtitle: `${name} is working on this host until ${day(assignment.expiresAt)}${ended}`, live: true};
  case "declined": return {subtitle: `Declined by ${name}`, live: false};
  case "revoked": return {subtitle: `Revoked from ${name}${ended}`, live: false};
  case "expired": return {subtitle: `The offer to ${name} ended on ${day(assignment.expiresAt)}`, live: false};
  }
}

/**
 * The host's referral partner, from More on a host's page: who has it now, an offer when nobody does, and a
 * revoke of this host or of the partner's whole account when someone does. An offer gives no organizer control
 * and no permission to send messages.
 */
export function SalesPartnerAccessWorkspace({actorUid, organizerId, organizerName}: {
  actorUid: string;
  organizerId: string;
  organizerName: string;
}) {
  const access = useSalesPartnerAccessController(actorUid, organizerId);
  const offer = useSalesPartnerOfferController(actorUid, organizerId, access.access?.assignment?.revision ?? 0);
  const [sheet, setSheet] = useState<"offer" | "revoke" | null>(null);
  const state = access.access ? rowState(access.access) : null;
  const trailing = access.loadError ?
    <CatchButton label="Try again" variant="secondary" size="sm" onPressed={() => void access.refresh()} /> :
    !state ? undefined :
      state.live ? <CatchButton label="Revoke" variant="secondary" size="sm" onPressed={() => setSheet("revoke")} /> :
        <CatchButton label="Offer" variant="secondary" size="sm" onPressed={() => setSheet("offer")} />;
  return (
    <>
      <CatchIndexRow title="Referral partner" titleVariant="bodyM"
        subtitle={access.loadError ?? state?.subtitle ?? "Loading"} {...(trailing ? {trailing} : {})} />
      {sheet === "offer" ? <OfferSheet offer={offer} organizerName={organizerName} onClose={() => setSheet(null)} /> : null}
      {sheet === "revoke" && access.access ? <RevokeSheet controller={access} access={access.access} organizerName={organizerName}
        onClose={() => setSheet(null)} /> : null}
    </>
  );
}

function OfferSheet({offer: c, organizerName, onClose}: {
  offer: ReturnType<typeof useSalesPartnerOfferController>; organizerName: string; onClose: () => void;
}) {
  const operationPending = useAdminOperationPending();
  const [partnerUid, setPartnerUid] = useState("");
  const [nextAction, setNextAction] = useState("");
  const [reviewAt, setReviewAt] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [reason, setReason] = useState("");
  const [reviewed, setReviewed] = useState(false);
  const locked = operationPending || !!c.ticket;
  const mode = locked ? "inactive" : "editable";
  const change = (setter: (value: string) => void) => (value: string) => {
    setter(value);
    setReviewed(false);
  };
  const iso = (value: string) => Number.isFinite(Date.parse(value)) ? new Date(value).toISOString() : "";
  const ready = !locked && reviewed && partnerUid.trim() && nextAction.trim() && reason.trim() && reviewAt && expiresAt;
  const submit = async () => {
    if (await c.offer({partnerUid, nextAction, reason, reviewAt: iso(reviewAt), expiresAt: iso(expiresAt)})) onClose();
  };
  return (
    <CatchSheet recipe="standard" pinFooter open onClose={onClose} title="Offer to a referral partner" subtitle={organizerName}
      footer={c.ticket ? <CatchButton label="Retry the same offer" variant="secondary" onPressed={operationPending ? null : () => void c.retry()} /> :
        <CatchButton label={c.busy ? "Offering" : "Offer"} onPressed={ready ? () => void submit() : null} />}>
      <CatchGap size="related">
        <CatchLegacyText as="p" variant="supporting">
          Nobody has {organizerName} now. The offer needs an active partner and a reviewed, unrestricted Sales account, and it
          never replaces a partner who has the host. The partner sees this organizer and the next action, then accepts or declines.
        </CatchLegacyText>
        {c.error ? <CatchLegacyText as="p" variant="supporting" role="alert">{c.error}</CatchLegacyText> : null}
        <CatchField recipe="input" title="Partner's account id" value={partnerUid} onChanged={change(setPartnerUid)} inputMode={mode} />
        <CatchField recipe="input" title="What they should do next" maxLines={3} value={nextAction} onChanged={change(setNextAction)} inputMode={mode} />
        <CatchField recipe="input" title="Review on" keyboardType="datetime" value={reviewAt} onChanged={change(setReviewAt)} inputMode={mode}
          helperText="Within 30 days." />
        <CatchField recipe="input" title="Offer ends" keyboardType="datetime" value={expiresAt} onChanged={change(setExpiresAt)} inputMode={mode}
          helperText="After the review, and within 90 days." />
        <CatchField recipe="input" title="Why this partner" maxLines={2} value={reason} onChanged={change(setReason)} inputMode={mode} />
        <CatchCheckboxInput label={`I checked this organizer and the exact account ${partnerUid || "above"}`} value={reviewed}
          onChanged={locked ? null : setReviewed} />
      </CatchGap>
    </CatchSheet>
  );
}

function RevokeSheet({controller: c, access, organizerName, onClose}: {
  controller: ReturnType<typeof useSalesPartnerAccessController>; access: PartnerAccess; organizerName: string; onClose: () => void;
}) {
  const operationPending = useAdminOperationPending();
  const [scope, setScope] = useState<PartnerRevokeScope>("host");
  const [reason, setReason] = useState("");
  const [reviewed, setReviewed] = useState(false);
  const locked = operationPending || !!c.ticket;
  const uid = access.assignment?.partnerUid ?? "";
  const name = partnerName(access);
  const membershipActive = access.membership?.state === "active";
  const choose = (value: PartnerRevokeScope) => () => {
    setScope(value);
    setReviewed(false);
  };
  const ready = !locked && reviewed && reason.trim();
  const submit = async () => {
    if (await c.revoke(scope, reason)) onClose();
  };
  return (
    <CatchSheet recipe="standard" pinFooter open onClose={onClose} title={`Revoke ${name}`} subtitle={organizerName}
      footer={c.ticket ? <CatchButton label="Retry the same revoke" variant="secondary" onPressed={operationPending ? null : () => void c.retry()} /> :
        <CatchButton label={c.busy ? "Revoking" : scope === "host" ? "Revoke this host" : "Revoke their partner account"}
          variant="danger" onPressed={ready ? () => void submit() : null} />}>
      <CatchGap size="section">
        <CatchGap size="related">
          <CatchChoiceTile title="Only this host" selected={scope === "host"} onTap={locked ? null : choose("host")}
            subtitle={`${name} stops working on ${organizerName}. Their other hosts and their partner account stay.`} />
          <CatchChoiceTile title="Their whole partner account" selected={scope === "partner"}
            onTap={locked || !membershipActive ? null : choose("partner")}
            subtitle={membershipActive ? `${name} loses every host and can't rejoin on their own.` :
              "Their partner account is already closed."} />
        </CatchGap>
        <CatchField recipe="input" title="Why" maxLines={3} maxLength={1000} value={reason} onChanged={setReason}
          inputMode={locked ? "inactive" : "editable"} helperText="The partner isn't shown this." />
        <CatchCheckboxInput label={`I checked this is the right partner: account ${uid}`} value={reviewed}
          onChanged={locked ? null : setReviewed} />
        {c.error ? <CatchLegacyText as="p" color="danger" variant="bodyS" role="alert">{c.error}</CatchLegacyText> : null}
      </CatchGap>
    </CatchSheet>
  );
}
