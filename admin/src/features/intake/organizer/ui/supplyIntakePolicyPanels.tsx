import {CatchField, CatchText} from "@catch/web-ui";
import {useState} from "react";
import {
  AdminButton,
  AdminForm,
  AdminIntakeSection,
  AdminOrganizerIntakeCheckboxField,
  AdminToolbar,
  Panel,
  StateRow,
  StatusChip,
} from "../../../../shared/ui/AdminPrimitives";
import type {SupplyIntakePolicy} from "../api/supplyIntakePolicyRepository";
import type {SupplyIntakePolicyController} from "../controllers/useSupplyIntakePolicyController";

type Decision = "accept" | "hold" | "reject";

const checklistItems: Array<[string, string]> = [
  ["requiredInputsReviewed", "I have read what this lets Catch do and its limits"],
  ["costAndSafetyReviewed", "The cost and safety limits are acceptable"],
  ["implementationOwnerReviewed", "An engineer will switch it on in a reviewed change"],
  ["behaviorStillDisabledAcknowledged", "Nothing turns on until that change ships"],
];

function stateOf(policy: SupplyIntakePolicy): [string, string] {
  if (policy.enabled && policy.configCitesDecision) return ["On", "success"];
  if (policy.decision?.decisionStatus === "accepted") return ["Accepted, not switched on yet", "ready"];
  if (policy.decision?.decisionStatus === "held") return ["On hold", "warning"];
  if (policy.decision?.decisionStatus === "rejected") return ["Rejected", "muted"];
  return ["Off, waiting for a decision", "warning"];
}

/**
 * Supply Intake capabilities that stay off until the owner decides. Recording
 * a decision never switches anything on; the policy file must cite it.
 */
export function renderSupplyIntakePolicies(controller: SupplyIntakePolicyController) {
  return <SupplyIntakePolicies controller={controller} />;
}

function SupplyIntakePolicies({controller}: {controller: SupplyIntakePolicyController}) {
  const [open, setOpen] = useState<string | null>(null);
  return <Panel title="Supply Intake policies" icon={null}>
    <CatchText as="p" variant="supporting">What Supply Intake may do on its own. Each stays off until you decide;
      an accepted decision is switched on in a reviewed change that cites it.</CatchText>
    {controller.page.isPending ? <CatchText as="p" variant="supporting">Loading policies…</CatchText> : null}
    {controller.page.error ? <CatchText as="p" variant="supporting" role="alert">
      Policies could not be loaded. Try again.</CatchText> : null}
    {controller.policies.map((policy) => {
      const [label, tone] = stateOf(policy);
      return <AdminIntakeSection key={policy.gapId}>
        <StateRow label={policy.label} value={<>
          <StatusChip tone={tone}>{label}</StatusChip>{" "}
          <AdminButton onClick={() => setOpen(policy.gapId)}>Decide</AdminButton>
        </>} />
        <CatchText as="p" variant="supporting">{policy.enables}</CatchText>
        {policy.limits.length ? <CatchText as="p" variant="supporting">Limits: {policy.limits
          .map((limit) => `${limit.label} ${limit.value}`).join(" · ")}.</CatchText> : null}
        {policy.decision?.note ? <CatchText as="p" variant="supporting">Last decision: {policy.decision.note}
          </CatchText> : null}
        {open === policy.gapId ? <PolicyDecisionForm policy={policy} controller={controller}
          onClose={() => setOpen(null)} /> : null}
      </AdminIntakeSection>;
    })}
  </Panel>;
}

function PolicyDecisionForm({policy, controller, onClose}: {
  policy: SupplyIntakePolicy;
  controller: SupplyIntakePolicyController;
  onClose: () => void;
}) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [note, setNote] = useState("");
  const complete = checklistItems.every(([key]) => checked[key]);
  const decide = async (decision: Decision) => {
    if (note.trim().length < 10 || (decision === "accept" && !complete)) return;
    const done = await controller.decide({gapId: policy.gapId, decision, note: note.trim(),
      checklist: Object.fromEntries(checklistItems.map(([key]) => [key, decision === "accept" || checked[key] === true])) as never});
    if (done) onClose();
  };
  return <AdminForm onSubmit={(event) => event.preventDefault()}>
    {checklistItems.map(([key, label]) => <AdminOrganizerIntakeCheckboxField key={key} label={label}
      checked={checked[key] === true} onChange={(value) => setChecked((current) => ({...current, [key]: value}))} />)}
    <CatchField recipe="input" title="Decision note" maxLines={3} maxLength={1000} value={note} onChanged={setNote}
      helperText="Why, in at least ten characters." />
    <AdminToolbar>
      <AdminButton variant="primary" disabled={!complete || note.trim().length < 10 || controller.isDeciding}
        onClick={() => void decide("accept")}>Accept</AdminButton>
      <AdminButton disabled={note.trim().length < 10 || controller.isDeciding}
        onClick={() => void decide("hold")}>Hold</AdminButton>
      <AdminButton disabled={note.trim().length < 10 || controller.isDeciding}
        onClick={() => void decide("reject")}>Reject</AdminButton>
      <AdminButton onClick={onClose}>Cancel</AdminButton>
    </AdminToolbar>
  </AdminForm>;
}
