import {CatchText, CatchField} from "@catch/web-ui";
import {MessageCircle} from "lucide-react";
import {AdminButton, CheckboxField, Panel} from
  "../../../shared/ui/AdminPrimitives";
import {useAdminOperationPending} from "../../../shared/pendingOperation";
import {useCatchWhatsappTrialController} from
  "../controllers/useCatchWhatsappTrialController";
import {type CatchTrialApi, type CatchTrialScope} from
  "../api/catchWhatsappTrialRepository";
import {useCatchWhatsappAvailabilityController} from "../controllers/useCatchWhatsappAvailabilityController";

export function CatchWhatsappTrialWorkspace({scope, enabled: override, api}: {
  scope: CatchTrialScope; enabled?: boolean; api?: CatchTrialApi;
}) {
  const enabled = useCatchWhatsappAvailabilityController(scope, override);
  const controller = useCatchWhatsappTrialController({scope, enabled, api});
  const operationPending = useAdminOperationPending();
  const locked = controller.busy || operationPending;
  const canEdit = enabled && !locked && !controller.terminal &&
    Boolean(controller.inbound) && !controller.expired;
  return <Panel title="WhatsApp support" icon={<MessageCircle size={18} />}>
    {!enabled ? <CatchText as="p" variant="supporting">WhatsApp support is currently unavailable.</CatchText> : <>
      <CatchText as="p" variant="supporting">Review one approved support request, then confirm the exact reply.</CatchText>
      <CatchField
        recipe="input"
        title="Support request ID"
        value={controller.eventId}
        onChanged={controller.setEventId}
        maxLength={69}
        inputMode={locked || controller.terminal ? "inactive" : "editable"}
        autoComplete="off"
      />
      <AdminButton onClick={() => void controller.review()}
        disabled={locked || controller.terminal ||
          !/^cwhe_[a-f0-9]{64}$/u.test(controller.eventId)}>
        Review request
      </AdminButton>
      {controller.inbound ? <>
        <CatchField
          recipe="input"
          title="Received support request"
          value={controller.inbound.inboundText}
          onChanged={() => undefined}
          inputMode="readOnly"
          maxLines={4}
        />
        <CatchText as="p" variant="supporting">Reply before {new Date(controller.inbound.deadlineMillis)
          .toLocaleString()}.</CatchText>
        <CatchField
          recipe="input"
          title="Exact reply"
          value={controller.replyBody}
          onChanged={controller.editReply}
          maxLines={4}
          maxLength={4096}
          inputMode={!canEdit ? "inactive" : "editable"}
        />
        <CheckboxField
          label="This message requests support, and I approve the exact reply shown."
          checked={controller.phase === "confirmed"}
          onChange={controller.confirm} disabled={!canEdit} />
        <AdminButton variant="primary" onClick={() => void controller.send()}
          disabled={!canEdit || controller.phase !== "confirmed"}>
          Send this reply once
        </AdminButton>
      </> : null}
      {controller.expired ? <CatchText as="p" variant="supporting" role="alert">The reply window has expired.</CatchText> : null}
      {controller.phase === "unknown" ? <CatchText as="p" variant="supporting" role="status">
        This attempt is reserved. Do not send again while its outcome is unconfirmed.
      </CatchText> : null}
      {controller.result ? <CatchText as="p" variant="supporting" role="status">
        Reply recorded. Delivery status: {controller.result.deliveryStatus}.
      </CatchText> : null}
    </>}
    {controller.error ? <CatchText as="p" variant="supporting" role="alert">{controller.error}</CatchText> : null}
  </Panel>;
}
