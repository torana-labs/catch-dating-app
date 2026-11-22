import {CatchButton, CatchConsentNote, CatchField, CatchStack, CatchText} from "@catch/web-ui";
import {appLinkCopy} from "@content/appDownload";
import {activePhoneCountry} from "@content/markets";
import {phoneFieldCopy} from "@content/phoneField";
import {Form} from "../../shared/ui/primitives";
import {useAppLinkCaptureController} from "./useAppLinkCaptureController";

/**
 * "Text me the link" beside Catch Host's store badges: the number (India by
 * default, with the country picker every phone field has) beside an outlined
 * button, stacking on phones, and under them the one short line with the
 * privacy policy linked. Once sent, the thanks takes the form's place and
 * the band's store badges (phones) or QR code (wide pages) right below it
 * are the link; after a failed send its words show and the button offers to
 * try again with the same request. The host landing's start band and the
 * playbook bands whose form is an app link request use it. `formId` names
 * the form in the lead's entry and its analytics events.
 */
export function AppLinkCapture({formId = appLinkCopy.formId}: {formId?: string}) {
  const capture = useAppLinkCaptureController(formId);
  return (
    <CatchStack gap={8}>
      {capture.sent ? null : (
        <Form aria-label={appLinkCopy.submit} noValidate onSubmit={capture.handleSubmit} pending={capture.submitting}>
          <CatchStack gap={8}>
            <CatchStack align="start" collapseBelow="medium" direction="row" gap={8} railWidth="fit">
              <CatchField copy={phoneFieldCopy} countryCode={activePhoneCountry} errorText={capture.phoneProblem} inputHint={appLinkCopy.label}
                inputMode={capture.submitting ? "inactive" : "editable"} labelMode="hidden" onChanged={capture.setPhone} recipe="phone" required
                title={appLinkCopy.label} value={capture.phone} />
              <CatchButton label={capture.sendProblem ? appLinkCopy.retry : appLinkCopy.submit} onPressed={() => undefined}
                status={capture.submitting ? "loading" : "idle"} type="submit" variant="secondary" />
            </CatchStack>
            <CatchConsentNote href="/privacy/" linkLabel={appLinkCopy.privacy} text={appLinkCopy.consent} />
          </CatchStack>
        </Form>
      )}
      <CatchText aria-live="polite" as="p" role="status" variant="body">{capture.sent ? appLinkCopy.sent : capture.sendProblem ?? ""}</CatchText>
    </CatchStack>
  );
}
