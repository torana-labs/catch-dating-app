import {CatchText, CatchField} from "@catch/web-ui";
import {useEffect, useLayoutEffect, useMemo, useRef, useState} from "react";
import type {ReactNode} from "react";
import {
  AdminButton,
  AdminForm,
  selectOptions,
  StateRow,
} from "../../../shared/ui/AdminPrimitives";
import type {ApprovedClause, DraftSourceRequest} from
  "../api/salesIntelligenceTypes";
import type {SalesContact, SalesOpportunity} from "../api/salesTypes";

type SubmitResult = unknown | null;

export interface SalesOutreachCompositionReviewProps {
  organizerId: string;
  evaluatedAt: string;
  eligible: boolean;
  blocked: boolean;
  contacts: SalesContact[];
  opportunities: SalesOpportunity[];
  clauses: ApprovedClause[];
  nextContactCursor: string | null;
  hasPreviousContacts: boolean;
  onNextContacts: (cursor: string) => void;
  onPreviousContacts: () => void;
  onGenerate: (request: DraftSourceRequest) => Promise<SubmitResult>;
}

function label(value: string): string {
  return value.replaceAll("_", " ").replace(/\b\w/gu,
    (letter) => letter.toUpperCase());
}

function isCurrentApprovedClause(row: ApprovedClause, evaluatedAt: string): boolean {
  return row.state === "approved" && row.permission !== "withdrawn" &&
    Date.parse(row.validUntil) > Date.parse(evaluatedAt) &&
    (row.kind !== "reference" || row.permission === "private_mention");
}

/**
 * Lower-case module API keeps this cohesive feature panel private while allowing
 * the owning Sales workspace and focused tests to render the exact same flow.
 */
export function salesOutreachCompositionReview(
  props: SalesOutreachCompositionReviewProps,
): ReactNode {
  return <SalesOutreachCompositionReviewBody key={props.organizerId} {...props} />;
}

function SalesOutreachCompositionReviewBody({organizerId, evaluatedAt,
  eligible, blocked, contacts: sourceContacts, opportunities: sourceOpportunities,
  clauses, nextContactCursor, hasPreviousContacts, onNextContacts,
  onPreviousContacts, onGenerate}: SalesOutreachCompositionReviewProps) {
  const [contactId, setContactId] = useState("");
  const [opportunityId, setOpportunityId] = useState("");
  const [observationId, setObservationId] = useState("");
  const [capabilityId, setCapabilityId] = useState("");
  const [referenceId, setReferenceId] = useState("");
  const [ctaId, setCtaId] = useState("");
  const [channel, setChannel] = useState<"email" | "message">("email");
  const [submitting, setSubmitting] = useState(false);
  const [submittedKey, setSubmittedKey] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const mounted = useRef(false);
  const submission = useRef(false);
  const epoch = useRef(0);

  useLayoutEffect(() => {
    mounted.current = true;
    epoch.current += 1;
    return () => {
      mounted.current = false;
      epoch.current += 1;
      submission.current = false;
    };
  }, []);

  const contacts = sourceContacts.filter((row) =>
    row.relationship.contactabilityStatus === "draft_reviewed");
  const opportunities = sourceOpportunities.filter((row) =>
    row.stage === "ready_to_contact");
  const approved = clauses.filter((row) =>
    isCurrentApprovedClause(row, evaluatedAt));
  const ofKind = (kind: ApprovedClause["kind"]) => approved.filter((row) =>
    row.kind === kind);
  const selectedContact = contacts.find((row) => row.contactId === contactId);
  const selectedOpportunity = opportunities.find((row) =>
    row.opportunityId === opportunityId);
  const selectedObservation = ofKind("observation").find((row) =>
    row.clauseId === observationId);
  const selectedCapability = ofKind("capability").find((row) =>
    row.clauseId === capabilityId);
  const selectedReference = referenceId ? ofKind("reference").find((row) =>
    row.clauseId === referenceId) : null;
  const selectedCta = ofKind("cta").find((row) => row.clauseId === ctaId);
  const request = selectedContact && selectedOpportunity &&
    selectedObservation && selectedCapability && selectedCta &&
    (!referenceId || selectedReference) ? {
      organizerId,
      contactId: selectedContact.contactId,
      opportunityId: selectedOpportunity.opportunityId,
      observationIds: [selectedObservation.clauseId],
      capabilityIds: [selectedCapability.clauseId],
      referenceIds: selectedReference ? [selectedReference.clauseId] : [],
      ctaIds: [selectedCta.clauseId],
      channel,
      purpose: "first_message" as const,
    } satisfies DraftSourceRequest : null;
  const compositionKey = useMemo(() => request ? JSON.stringify(request) : "",
    [request]);
  const interactionBlocked = blocked || submitting;
  const canSubmit = Boolean(eligible && request && !interactionBlocked &&
    compositionKey !== submittedKey);

  useEffect(() => {
    setNotice("");
    setError("");
  }, [compositionKey]);

  const submit = async () => {
    if (!canSubmit || !request || submission.current) return;
    const frozen = structuredClone(request);
    const frozenKey = compositionKey;
    const currentEpoch = epoch.current;
    submission.current = true;
    setSubmitting(true);
    setNotice("");
    setError("");
    try {
      const result = await onGenerate(frozen);
      if (!mounted.current || currentEpoch !== epoch.current) return;
      if (result === null) {
        setError("This composition plan was not confirmed. Retry the unchanged request above.");
        return;
      }
      setSubmittedKey(frozenKey);
      setNotice("Composition plan submitted. This is not the final draft; review the exact server draft below.");
    } catch {
      if (!mounted.current || currentEpoch !== epoch.current) return;
      setError("This composition plan was not confirmed. Retry the unchanged request above.");
    } finally {
      submission.current = false;
      if (mounted.current && currentEpoch === epoch.current) setSubmitting(false);
    }
  };

  const options = (kind: ApprovedClause["kind"], optional = false) => [
    {value: "", label: optional ? "No reference" : "Choose approved wording"},
    ...ofKind(kind).map((row) => ({value: row.clauseId, label: row.text})),
  ];

  return <>
    <CatchText as="p" variant="supporting">This editable composition plan chooses current approved wording. It is
      not the final draft, cannot send a message, and does not grant contact
      authority. The deterministic server draft still needs separate exact-content review.</CatchText>
    {!eligible ? <CatchText as="p" variant="supporting" role="alert">This host needs an active fit policy, a
      qualified Sales record and clear contact restrictions before drafting.</CatchText> : null}
    <AdminForm onSubmit={(event) => {event.preventDefault(); void submit();}}>
      <CatchText as="h3" variant="sectionTitle">Review a first-message composition plan</CatchText>
      <CatchField
        recipe="select"
        title="Reviewed contact"
        value={contactId}
        onChanged={(value) => setContactId(value ?? "")}
        inputMode={interactionBlocked ? "inactive" : "editable"}
        {...selectOptions([{value: "", label: "Choose contact"},
          ...contacts.map((row) => ({value: row.contactId,
            label: `${row.displayName} · ${row.relationship.role}`}))])}
      />
      {nextContactCursor ? <AdminButton disabled={interactionBlocked}
        onClick={() => onNextContacts(nextContactCursor)}>More contacts</AdminButton> : null}
      {hasPreviousContacts ? <AdminButton disabled={interactionBlocked}
        onClick={onPreviousContacts}>Previous contacts</AdminButton> : null}
      <CatchField
        recipe="select"
        title="Opportunity ready for contact"
        value={opportunityId}
        onChanged={(value) => setOpportunityId(value ?? "")}
        inputMode={interactionBlocked ? "inactive" : "editable"}
        {...selectOptions([{value: "", label: "Choose opportunity"},
          ...opportunities.map((row) => ({value: row.opportunityId,
            label: `${label(row.motion)} · ${label(row.stage)}`}))])}
      />
      <CatchField
        recipe="select"
        title="Host observation"
        value={observationId}
        onChanged={(value) => setObservationId(value ?? "")}
        inputMode={interactionBlocked ? "inactive" : "editable"}
        {...selectOptions(options("observation"))}
      />
      <CatchField
        recipe="select"
        title="Catch capability"
        value={capabilityId}
        onChanged={(value) => setCapabilityId(value ?? "")}
        inputMode={interactionBlocked ? "inactive" : "editable"}
        {...selectOptions(options("capability"))}
      />
      <CatchField
        recipe="select"
        title="Private reference (optional)"
        value={referenceId}
        onChanged={(value) => setReferenceId(value ?? "")}
        inputMode={interactionBlocked ? "inactive" : "editable"}
        {...selectOptions(options("reference", true))}
      />
      <CatchField
        recipe="select"
        title="Question or next step"
        value={ctaId}
        onChanged={(value) => setCtaId(value ?? "")}
        inputMode={interactionBlocked ? "inactive" : "editable"}
        {...selectOptions(options("cta"))}
      />
      <CatchField
        recipe="select"
        title="Draft channel"
        value={channel}
        onChanged={(value) => setChannel((value ?? "") as typeof channel)}
        inputMode={interactionBlocked ? "inactive" : "editable"}
        {...selectOptions([
          {value: "email", label: "Email draft"},
          {value: "message", label: "Message draft"},
        ])}
      />
      <CatchText as="h3" variant="sectionTitle">Composition review</CatchText>
      <StateRow label="Contact" value={selectedContact?.displayName ?? "Not selected"} />
      <StateRow label="Opportunity" value={selectedOpportunity ?
        `${label(selectedOpportunity.motion)} · ${label(selectedOpportunity.stage)}` :
        "Not selected"} />
      <StateRow label="Approved wording" value={request ?
        `${request.observationIds.length} observation · ${request.capabilityIds.length} capability · ${request.referenceIds.length} reference · ${request.ctaIds.length} next step` :
        "Complete every required selection"} />
      <StateRow label="Output" value="Deterministic private draft · separate exact review · manual copy only" />
      <AdminButton type="submit" variant="primary" aria-label={submitting ?
        "Submitting composition plan" : "Prepare private draft"}
        disabled={!canSubmit}>{submitting ? "Submitting composition plan" :
          "Review plan and prepare private draft"}</AdminButton>
    </AdminForm>
    {notice ? <CatchText as="p" variant="supporting" role="status">{notice}</CatchText> : null}
    {error ? <CatchText as="p" variant="supporting" role="alert">{error}</CatchText> : null}
  </>;
}
