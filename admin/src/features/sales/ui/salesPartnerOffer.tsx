import {CatchText, CatchField} from "@catch/web-ui";
import {Handshake} from "lucide-react";
import {useState} from "react";
import {AdminButton, AdminForm, CheckboxField, Panel} from "../../../shared/ui/AdminPrimitives";
import {useAdminOperationPending} from "../../../shared/pendingOperation";
import {useSalesPartnerOfferController} from "../controllers/useSalesPartnerOfferController";

function PartnerOffer({actorUid, organizerId, organizerName}: {
  actorUid: string; organizerId: string; organizerName: string;
}) {
  const c = useSalesPartnerOfferController(actorUid, organizerId);
  const operationPending = useAdminOperationPending();
  const [partnerUid, setPartnerUid] = useState(""); const [nextAction, setNextAction] = useState("");
  const [reviewAt, setReviewAt] = useState(""); const [expiresAt, setExpiresAt] = useState("");
  const [reason, setReason] = useState(""); const [reviewed, setReviewed] = useState(false);
  const disabled = operationPending || !!c.ticket || !!c.offeredTo;
  const change = (setter: (value: string) => void) => (value: string) => {setter(value); setReviewed(false);};
  return <Panel title="Offer this lead to a referral partner" icon={<Handshake size={18} />}>
    <CatchText as="p" variant="supporting">This creates the first partner offer for {organizerName}. It requires an active partner membership
      and a reviewed, unrestricted Sales account. Existing assignments are never overwritten here.</CatchText>
    <CatchText as="p" variant="supporting">The partner can see this organizer and next action, then accept or decline. An offer grants no
      organizer control or permission to send messages.</CatchText>
    {c.error && <CatchText as="p" variant="supporting" role="alert">{c.error}</CatchText>}
    {c.offeredTo ? <CatchText as="p" variant="supporting" role="status">Lead offered to account {c.offeredTo}. Ask the partner to refresh their workspace.</CatchText> :
    <AdminForm onSubmit={(event) => {
      event.preventDefault(); if (!reviewed || disabled) return;
      void c.offer({partnerUid, nextAction, reason,
        reviewAt: Number.isFinite(Date.parse(reviewAt)) ? new Date(reviewAt).toISOString() : "",
        expiresAt: Number.isFinite(Date.parse(expiresAt)) ? new Date(expiresAt).toISOString() : ""});
    }}>
      <CatchField
        recipe="input"
        title="Verified partner account UID"
        value={partnerUid}
        onChanged={change(setPartnerUid)}
        inputMode={disabled ? "inactive" : "editable"}
      />
      <CatchField
        recipe="input"
        title="Next action for the partner"
        value={nextAction}
        onChanged={change(setNextAction)}
        inputMode={disabled ? "inactive" : "editable"}
        maxLines={3}
      />
      <CatchField
        recipe="input"
        title="Review at (your local time)"
        value={reviewAt}
        onChanged={change(setReviewAt)}
        inputMode={disabled ? "inactive" : "editable"}
        keyboardType="datetime"
      />
      <CatchField
        recipe="input"
        title="Assignment expires (your local time)"
        value={expiresAt}
        onChanged={change(setExpiresAt)}
        inputMode={disabled ? "inactive" : "editable"}
        keyboardType="datetime"
      />
      <CatchField
        recipe="input"
        title="Reason for this assignment"
        value={reason}
        onChanged={change(setReason)}
        inputMode={disabled ? "inactive" : "editable"}
        maxLines={2}
      />
      <CheckboxField label={`I reviewed this organizer identity and the exact partner account ${partnerUid || "above"}`} checked={reviewed} onChange={setReviewed} disabled={disabled} />
      <AdminButton type="submit" variant="primary" disabled={disabled || !reviewed || !partnerUid.trim() || !nextAction.trim() || !reason.trim() || !reviewAt || !expiresAt}>Offer lead</AdminButton>
    </AdminForm>}
    {c.ticket && <AdminButton disabled={operationPending} onClick={() => void c.retry()}>Retry unchanged offer</AdminButton>}
  </Panel>;
}
export function renderSalesPartnerOffer(actorUid: string, organizerId: string, organizerName: string) {
  return <PartnerOffer key={`${actorUid}:${organizerId}`} actorUid={actorUid} organizerId={organizerId} organizerName={organizerName} />;
}
