import {CatchButton, CatchCheckboxInput, CatchField, CatchGap, CatchText} from "@catch/web-ui";
import {useWebsiteAccountController} from "../account/useWebsiteAccountController";
import {renderAccountForm} from "../account/accountForm";
import {useFreeEventRegistrationController} from "./useFreeEventRegistrationController";
import {PublicPaidEventRegistration} from "./PublicPaidEventRegistration";
import {EventWhatsappPreferencesPanel} from "../eventMessaging/EventWhatsappPreferencesPanel";
import {EventRcsPreferencesPanel} from "../eventMessaging/EventRcsPreferencesPanel";
import {EventSmsPreferencePanel} from "../eventMessaging/EventSmsPreferencePanel";
import {eventDetailCopy} from "../../content/events";
import {usePendingRequestNavigationBlocked} from "../../shared/pendingRequest";
import {Form} from "../../shared/ui/primitives";
import {eventInviteTokenFromLocation} from "../../shared/eventInviteAttribution";

const noop = () => undefined;

export function PublicEventRegistration({eventId, inviteToken, mode = "free", allowNewBookings = true}: {eventId: string; inviteToken?: string | null; mode?: "free" | "paid"; allowNewBookings?: boolean}) {
  if (!allowNewBookings && mode === "paid") return <PublicPaidEventRegistration key={eventId} eventId={eventId} allowNewBookings={false} inviteToken={inviteToken ?? null} />;
  return <AccountEventRegistration key={eventId} eventId={eventId} inviteToken={inviteToken} mode={mode} />;
}
function AccountEventRegistration({eventId, inviteToken, mode}: {eventId: string; inviteToken?: string | null; mode: "free" | "paid"}) {
  const account = useWebsiteAccountController({eventId});
  if (!account.ready) return renderAccountForm(account);
  return mode === "paid" ? <PublicPaidEventRegistration key={account.uid} eventId={eventId} initialDisplayName={account.account?.displayName} inviteToken={inviteToken ?? eventInviteTokenFromLocation()} /> :
    <FreeEventRegistration key={account.uid} eventId={eventId} initialDisplayName={account.account?.displayName} inviteToken={inviteToken} />;
}

function FreeEventRegistration({
  eventId,
  inviteToken: inviteTokenOverride,
  initialDisplayName,
}: {
  eventId: string;
  inviteToken?: string | null;
  initialDisplayName?: string;
}) {
  const {reactId, recaptchaContainerId, displayName, setDisplayName,
    phoneNumber, setPhoneNumber, code, setCode, whatsappUpdates, setWhatsappUpdates,
    smsUpdates, setSmsUpdates, stage, registeredScope, pending, status,
    verified, handleSubmit} = useFreeEventRegistrationController(eventId, inviteTokenOverride, initialDisplayName);
  // Links hold while a booking request is in flight.
  const go = usePendingRequestNavigationBlocked() ? null : noop;
  const copy = eventDetailCopy.hero.webRegistration;

  return (
    <Form noValidate onSubmit={handleSubmit} pending={pending}>
      <CatchGap size="related">
        <CatchField
          recipe="input"
          autoComplete="name"
          inputMode={pending || stage !== "details" ? "inactive" : "editable"}
          id={`${reactId}-event-registration-name`}
          title={copy.nameLabel}
          maxLength={120}
          onChanged={(value) => setDisplayName(value)}
          inputHint={copy.namePlaceholder}
          value={displayName}
        />
        <CatchField
          recipe="input"
          autoComplete="tel"
          inputMode={verified || pending || stage !== "details" ? "inactive" : "editable"}
          id={`${reactId}-event-registration-phone`}
          title={copy.phoneLabel}
          onChanged={(value) => setPhoneNumber(value)}
          inputHint={copy.phonePlaceholder}
          value={phoneNumber}
          keyboardType="phone"
        />
        <CatchCheckboxInput label={copy.whatsappConsent} value={whatsappUpdates}
          onChanged={pending || stage !== "details" ? null : setWhatsappUpdates} />
        <CatchCheckboxInput label={copy.smsConsent} value={smsUpdates}
          onChanged={pending || stage !== "details" ? null : setSmsUpdates} />
        <CatchText as="p" color="ink2" variant="bodyS">{copy.consentDetail}</CatchText>
        {stage === "code" ? (
          <CatchField
            recipe="input"
            autoComplete="one-time-code"
            inputMode={pending ? "inactive" : "editable"}
            id={`${reactId}-event-registration-code`}
            title={copy.codeLabel}
            maxLength={6}
            onChanged={(value) => setCode(value.replace(/\D/gu, ""))}
            inputHint={copy.codePlaceholder}
            value={code}
            keyboardType="number"
          />
        ) : null}
        <div id={recaptchaContainerId} />
        {stage !== "success" ? (
          <CatchButton fullWidth onPressed={noop} status={pending ? "loading" : "idle"} type="submit"
            label={stage === "details" ? verified ? copy.registerAction : copy.sendCodeAction : copy.confirmAction} />
        ) : null}
        <CatchText as="p" color={status.tone === "is-error" ? "danger" : "ink2"} role="status" variant="bodyS">{status.message}</CatchText>
        {stage === "success" && registeredScope?.eventId === eventId ?
          <>
            <CatchButton fullWidth href={`/booking/${encodeURIComponent(eventId)}/`} label={eventDetailCopy.hero.guestAction}
              onPressed={go} />
            <EventSmsPreferencePanel {...registeredScope} />
            <EventRcsPreferencesPanel {...registeredScope} />
            <EventWhatsappPreferencesPanel {...registeredScope} />
          </> : null}
        <CatchText as="p" color="ink2" variant="bodyS">{copy.privacy}</CatchText>
      </CatchGap>
    </Form>
  );
}
