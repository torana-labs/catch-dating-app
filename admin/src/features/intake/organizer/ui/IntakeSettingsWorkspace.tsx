import {
  CatchBadge,
  type CatchBadgeTone,
  CatchButton,
  CatchCheckboxInput,
  CatchDialog,
  CatchField,
  CatchGap,
  CatchIndexRow,
  CatchSection,
  CatchSheet,
  CatchWorkspaceHeader,
} from "@catch/web-ui";
import {useState} from "react";
import {launchMarkets} from "../../../../shared/config/launchMarkets";
import type {SupplyIntakePolicy} from "../api/supplyIntakePolicyRepository";
import type {SupplyIntakePolicyController} from "../controllers/useSupplyIntakePolicyController";
import {nominatorSender, type SupplyNominatorController} from "../controllers/useSupplyNominatorController";

export type IntakePoliciesModel = Pick<SupplyIntakePolicyController, "policies" | "decide" | "isDeciding"> & {
  isLoading: boolean;
  loadFailed: boolean;
};
export type IntakeNominatorsModel = Pick<SupplyNominatorController, "nominators" | "myUid" | "save" | "isSaving"> & {
  isLoading: boolean;
  loadFailed: boolean;
};

type Decision = "accept" | "hold" | "reject";
type Role = "associate" | "partner";
type Channel = "whatsapp" | "instagram";

const checklistItems: Array<[string, string]> = [
  ["requiredInputsReviewed", "I have read what this lets Catch do and its limits"],
  ["costAndSafetyReviewed", "The cost and safety limits are acceptable"],
  ["implementationOwnerReviewed", "An engineer will switch it on in a reviewed change"],
  ["behaviorStillDisabledAcknowledged", "Nothing turns on until that change ships"],
];
const roles: Array<{value: Role; label: string}> = [
  {value: "associate", label: "Sales associate (staff)"},
  {value: "partner", label: "Partner"},
];
const channels: Array<{value: Channel; label: string}> = [
  {value: "whatsapp", label: "WhatsApp"},
  {value: "instagram", label: "Instagram"},
];
const cities = [{value: "", label: "No default city"},
  ...launchMarkets.map((market) => ({value: market.publicPageCitySlug, label: market.cityName}))];
const PHONE = /^\+[1-9][0-9]{6,14}$/u;
const HANDLE = /^[a-z0-9._]{1,30}$/u;

function policyState(policy: SupplyIntakePolicy): [string, CatchBadgeTone] {
  if (policy.enabled && policy.configCitesDecision) return ["On", "success"];
  if (policy.decision?.decisionStatus === "accepted") return ["Accepted, not switched on yet", "success"];
  if (policy.decision?.decisionStatus === "held") return ["On hold", "warning"];
  if (policy.decision?.decisionStatus === "rejected") return ["Rejected", "neutral"];
  return ["Off, waiting for a decision", "warning"];
}

/** A pasted "@Name.Here" or profile link, as the lowercase username the backend stores. */
function instagramUsername(value: string): string {
  return value.trim().replace(/^(?:https?:\/\/)?(?:www\.)?instagram\.com\//iu, "").replace(/^@/u, "")
    .replace(/[/?#].*$/u, "").toLowerCase();
}

/** Recording a decision never switches anything on; the policy file must cite it in a reviewed change. */
function PolicyDecision({policy, model, onClose}: {
  policy: SupplyIntakePolicy;
  model: IntakePoliciesModel;
  onClose: () => void;
}) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [note, setNote] = useState("");
  const complete = checklistItems.every(([key]) => checked[key]);
  const noted = note.trim().length >= 10;
  const decide = async (decision: Decision) => {
    const done = await model.decide({gapId: policy.gapId, decision, note: note.trim(),
      checklist: Object.fromEntries(checklistItems.map(([key]) => [key, decision === "accept" || checked[key] === true])) as never});
    if (done) onClose();
  };
  return (
    <CatchDialog
      open
      onClose={onClose}
      title={policy.label}
      message={`${policy.enables} Accepting switches nothing on: a reviewed change that cites this decision does.`}
      confirm={{label: "Accept", onPressed: complete && noted && !model.isDeciding ? () => void decide("accept") : null}}
      cancel={{label: "Cancel", onPressed: onClose}}
    >
      <CatchGap size="related">
        {checklistItems.map(([key, label]) => <CatchCheckboxInput key={key} label={label} value={checked[key] === true}
          onChanged={(value) => setChecked((current) => ({...current, [key]: value}))} />)}
        <CatchField recipe="input" title="Decision note" maxLines={3} maxLength={1000} value={note} onChanged={setNote}
          helperText="Why, in at least ten characters." />
        <CatchGap size="inline" direction="horizontal">
          <CatchButton label="Hold" variant="secondary" size="sm"
            onPressed={noted && !model.isDeciding ? () => void decide("hold") : null} />
          <CatchButton label="Reject" variant="secondary" size="sm"
            onPressed={noted && !model.isDeciding ? () => void decide("reject") : null} />
        </CatchGap>
      </CatchGap>
    </CatchDialog>
  );
}

/** The add-someone sheet. Re-entering a number or username changes or switches off that nominator. */
function NominatorSheet({model, onClose}: {model: IntakeNominatorsModel; onClose: () => void}) {
  const [channel, setChannel] = useState<Channel>("whatsapp");
  const [phone, setPhone] = useState("");
  const [handle, setHandle] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [uid, setUid] = useState("");
  const [role, setRole] = useState<Role>("associate");
  const [city, setCity] = useState("mumbai");
  const [active, setActive] = useState(true);
  const phoneE164 = phone.replace(/[\s-]/gu, "");
  const instagramHandle = instagramUsername(handle);
  const endpoint = channel === "whatsapp" ?
    (PHONE.test(phoneE164) ? {phoneE164} : null) :
    (HANDLE.test(instagramHandle) ? {instagramHandle} : null);
  const ready = endpoint !== null && displayName.trim().length > 0 && /^[A-Za-z0-9_-]{1,128}$/u.test(uid.trim());
  const submit = async () => {
    if (!ready) return;
    const done = await model.save({...endpoint, uid: uid.trim(), role, displayName: displayName.trim(),
      defaultMarket: city || null, active});
    if (done) onClose();
  };
  return (
    <CatchSheet recipe="standard" open onClose={onClose} title="Add someone who can nominate" subtitle="Intake settings"
      footer={<CatchButton label={model.isSaving ? "Saving" : "Save"} onPressed={ready && !model.isSaving ? () => void submit() : null} />}>
      <CatchGap size="related">
        <CatchField recipe="select" title="They message Catch on" value={channel}
          values={channels.map((entry) => entry.value)}
          itemLabelBuilder={(value) => channels.find((entry) => entry.value === value)?.label ?? value}
          onChanged={(value) => setChannel((value ?? "whatsapp") as Channel)} />
        {channel === "whatsapp" ?
          <CatchField recipe="input" title="WhatsApp number" maxLength={20} value={phone} onChanged={setPhone}
            helperText="With the country code, like +919800012345. Re-enter a number to change or switch it off." /> :
          <CatchField recipe="input" title="Instagram username" maxLength={80} value={handle} onChanged={setHandle}
            helperText="Their username or profile link. Re-enter a username to change or switch it off." />}
        <CatchField recipe="input" title="Name" maxLength={80} value={displayName} onChanged={setDisplayName} />
        <CatchField recipe="select" title="Role" value={role} values={roles.map((entry) => entry.value)}
          itemLabelBuilder={(value) => roles.find((entry) => entry.value === value)?.label ?? value}
          onChanged={(value) => setRole((value ?? "associate") as Role)} />
        <CatchField recipe="select" title="City their nominations default to" value={city} values={cities.map((entry) => entry.value)}
          itemLabelBuilder={(value) => cities.find((entry) => entry.value === value)?.label ?? value}
          onChanged={(value) => setCity(value ?? "")} />
        <CatchField recipe="input" title="Catch account id" maxLength={128} value={uid} onChanged={setUid}
          helperText="The staff or partner account their nominations are credited to." />
        {model.myUid ? <CatchButton label="Use my account" variant="secondary" size="sm"
          onPressed={() => setUid(model.myUid ?? "")} /> : null}
        <CatchCheckboxInput label="Can nominate" value={active} onChanged={setActive} />
      </CatchGap>
    </CatchSheet>
  );
}

/**
 * Settings → Intake: what Intake may do on its own, its limits, who can
 * nominate by message, and the launch cities. Anyone else who messages Catch
 * reaches Support, not Intake.
 */
export function IntakeSettingsWorkspace({policies, nominators}: {
  policies: IntakePoliciesModel;
  nominators: IntakeNominatorsModel;
}) {
  const [deciding, setDeciding] = useState<SupplyIntakePolicy | null>(null);
  const [adding, setAdding] = useState(false);
  const limits = policies.policies.flatMap((policy) => policy.limits);
  return (
    <>
      <CatchWorkspaceHeader title="Intake" kicker="Settings" />
      <CatchGap size="section">
        <CatchSection title="What Intake does on its own" container="tile"
          note={policies.loadFailed ? "These could not be loaded. Try again." : policies.isLoading ? "Loading…" :
            "Off until you decide"}>
          {policies.policies.map((policy) => {
            const [label, tone] = policyState(policy);
            return <CatchIndexRow key={policy.gapId} title={policy.label} titleVariant="bodyM"
              subtitle={policy.decision?.note ? `${policy.enables} Last decision: ${policy.decision.note}` : policy.enables}
              footer={<CatchBadge recipe="status" tone={tone} label={label} />}
              trailing={<CatchButton label="Decide" variant="secondary" size="sm" onPressed={() => setDeciding(policy)} />} />;
          })}
        </CatchSection>
        {limits.length ? (
          <CatchSection title="Limits" container="tile">
            {limits.map((limit) => <CatchIndexRow key={limit.label} title={limit.label} titleVariant="bodyM"
              trailing={String(limit.value)} />)}
          </CatchSection>
        ) : null}
        <CatchSection title="Who can nominate" count={nominators.nominators.length}
          action={{label: "Add someone", onPressed: () => setAdding(true)}}
          note={nominators.loadFailed ? "Nominators could not be loaded. Try again." : nominators.isLoading ? "Loading…" : undefined}
          empty={<CatchIndexRow title="Nobody can nominate by message yet." />}>
          {nominators.nominators.map((nominator) => <CatchIndexRow key={nominator.nominatorId}
            title={nominator.displayName} titleVariant="bodyM"
            subtitle={[nominator.role === "associate" ? "Sales associate" : "Partner", nominator.defaultMarket,
              nominatorSender(nominator).replace(/^the /u, "")].filter(Boolean).join(" · ")}
            trailing={<CatchBadge recipe="status" tone={nominator.active ? "success" : "neutral"}
              label={nominator.active ? "Can nominate" : "Switched off"} />} />)}
          <CatchIndexRow title="Messages from anyone else" titleVariant="bodyM" subtitle="Go to Support, not to Intake" />
        </CatchSection>
        <CatchSection title="Launch cities" note={'Nominations elsewhere wait as "Outside launch cities"'} dividers="none">
          <CatchGap size="inline" direction="horizontal">
            {launchMarkets.map((market) => <CatchBadge key={market.publicPageCitySlug} recipe="status" tone="neutral" label={market.cityName} />)}
          </CatchGap>
        </CatchSection>
      </CatchGap>
      {deciding ? <PolicyDecision policy={deciding} model={policies} onClose={() => setDeciding(null)} /> : null}
      {adding ? <NominatorSheet model={nominators} onClose={() => setAdding(false)} /> : null}
    </>
  );
}
