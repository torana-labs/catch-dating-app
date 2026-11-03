import {CatchButton, CatchCheckboxInput, CatchField, CatchGap, CatchIndexRow, CatchSheet, CatchLegacyText} from "@catch/web-ui";
import {useState} from "react";
import {useAdminOperationPending} from "../../../shared/pendingOperation";
import {useSalesPartnerOfferController} from "../controllers/useSalesPartnerOfferController";

/**
 * Offers a host to a referral partner, from More on a host's page. The partner can accept or decline,
 * and an offer gives them no organizer control and no permission to send messages.
 */
export function SalesPartnerOfferWorkspace({actorUid, organizerId, organizerName}: {
  actorUid: string;
  organizerId: string;
  organizerName: string;
}) {
  const c = useSalesPartnerOfferController(actorUid, organizerId);
  const operationPending = useAdminOperationPending();
  const [open, setOpen] = useState(false);
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
    if (await c.offer({partnerUid, nextAction, reason, reviewAt: iso(reviewAt), expiresAt: iso(expiresAt)})) setOpen(false);
  };
  return (
    <>
      <CatchIndexRow title="Offer to a referral partner" titleVariant="bodyM" subtitle={c.offeredTo ? `Offered to account ${c.offeredTo}` : "Not offered"}
        {...(c.offeredTo ? {} : {trailing: <CatchButton label="Offer" variant="secondary" size="sm" onPressed={() => setOpen(true)} />})} />
      {open ? (
        <CatchSheet recipe="standard" pinFooter open onClose={() => setOpen(false)} title="Offer to a referral partner" subtitle={organizerName}
          footer={c.ticket ? <CatchButton label="Retry the same offer" variant="secondary" onPressed={operationPending ? null : () => void c.retry()} /> :
            <CatchButton label={c.busy ? "Offering" : "Offer"} onPressed={ready ? () => void submit() : null} />}>
          <CatchGap size="related">
            <CatchLegacyText as="p" variant="supporting">
              This is the first partner offer for {organizerName}. It needs an active partner and a reviewed, unrestricted Sales account, and it never
              overwrites an existing assignment. The partner sees this organizer and the next action, then accepts or declines.
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
      ) : null}
    </>
  );
}
