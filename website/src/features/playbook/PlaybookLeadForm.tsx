import {CatchButton, CatchConsentNote, CatchField, CatchGroundCard, CatchStack, CatchText} from "@catch/web-ui";
import type {ReactNode} from "react";
import {interpolateContent as fill} from "@content/interpolate";
import {playbookCopy} from "../../content/playbook/playbookCopy";
import type {PlaybookLeadForm as PlaybookLeadFormContent} from "../../content/playbook/playbookContract";
import {Form} from "../../shared/ui/primitives";
import {playbookSendableLeadKind, type PlaybookLeadField, type PlaybookSendableLeadKind} from "./playbookLeadModel";
import {usePlaybookLeadFormController} from "./usePlaybookLeadFormController";
import type {PlaybookLeadFormProps} from "./usePlaybookPageController";
import {phoneFieldCopy} from "@content/phoneField";
import {activePhoneCountry} from "@content/markets";

/** The consent line under the button, naming the button, with the privacy policy linked at its end. */
function ConsentLine({action}: {action: string}) {
  return <CatchConsentNote href="/privacy/" linkLabel={playbookCopy.leadForm.privacy} text={fill(playbookCopy.leadForm.consent, {action})} />;
}

/**
 * A playbook page's lead form, as the boards draw it. A form that asks only
 * for the number (send me the guide) is the final band's capture row: the
 * number beside an outlined button, under the band's own actions. A form
 * with more fields (list your space, get a demo link) is a white card of
 * labelled fields with the number last and a filled button. Under either sit
 * the page's note and the consent line. Once sent, the thanks takes the
 * form's place; after a failed send its words show and the button offers to
 * try again with the same request. A `leadIn` (the referral form's sign-in)
 * sits above the form element, not inside it, until the form is sent.
 */
function PlaybookLeadForm({form, kind, leadIn}: {form: PlaybookLeadFormContent; kind: PlaybookSendableLeadKind; leadIn?: ReactNode}) {
  const lead = usePlaybookLeadFormController(form, kind);
  const fields = form.fields ?? [];
  const card = fields.length > 0;
  const inputMode = lead.submitting ? "inactive" : "editable";
  const phone = (
    <CatchField copy={phoneFieldCopy} countryCode={activePhoneCountry} errorText={lead.problem("phone")} inputHint={card ? undefined : form.label}
      inputMode={inputMode} labelMode={card ? "visible" : "hidden"} onChanged={lead.set("phone")} recipe="phone" required
      title={form.label} value={lead.answers.phone ?? ""} />
  );
  const button = (
    <CatchButton label={lead.submitLabel} onPressed={() => undefined} status={lead.submitting ? "loading" : "idle"} type="submit"
      variant={card ? "primary" : "secondary"} />
  );
  const footer = (
    <>
      {form.note ? <CatchText tone="secondary" variant="body-meta">{form.note}</CatchText> : null}
      <ConsentLine action={form.submitLabel} />
    </>
  );
  const body: ReactNode = card ? (
    <CatchStack gap={12}>
      {fields.map((field) => {
        const name = field.name as PlaybookLeadField;
        return (
          <CatchField autoComplete={name === "name" ? "name" : "off"} errorText={lead.problem(name)} inputHint={field.placeholder} inputMode={inputMode}
            key={name} labelMode="visible" onChanged={lead.set(name)} recipe="input" required title={field.label} value={lead.answers[name] ?? ""} />
        );
      })}
      {phone}
      <CatchStack align="start">{button}</CatchStack>
      {footer}
    </CatchStack>
  ) : (
    <CatchStack gap={8}>
      <CatchStack align="start" collapseBelow="medium" direction="row" gap={8} railWidth="fit">{phone}{button}</CatchStack>
      {footer}
    </CatchStack>
  );
  const content = (
    <CatchStack gap={12}>
      {lead.sent ? null : leadIn}
      {lead.sent ? null : (
        <Form aria-label={form.submitLabel} noValidate onSubmit={lead.handleSubmit} pending={lead.submitting}>{body}</Form>
      )}
      <CatchText aria-live="polite" as="p" role="status" variant="body">{lead.sent ? lead.sentMessage : lead.sendProblem ?? ""}</CatchText>
    </CatchStack>
  );
  return card ? <CatchGroundCard ground="white" outlined>{content}</CatchGroundCard> : content;
}

/**
 * A band's lead form when the website lead intake can take what it asks for
 * (./playbookLeadModel: playbookSendableLeadKind); otherwise nothing, and the
 * band's WhatsApp actions stand alone. Keyed by page, band and form, so a
 * form starts empty on every page. `leadIn` goes above the form element.
 */
export function playbookLeadFormNode({form, pageId, sectionId}: PlaybookLeadFormProps, leadIn?: ReactNode): ReactNode {
  const kind = playbookSendableLeadKind(form);
  return kind ? <PlaybookLeadForm form={form} key={`${pageId}-${sectionId}-${form.id}`} kind={kind} leadIn={leadIn} /> : null;
}
