import {CatchAdminIntakeSection, CatchBadge, CatchField, CatchText} from "@catch/web-ui";
import {useState} from "react";
import {launchMarkets} from "../../../../shared/config/launchMarkets";
import {
  AdminButton,
  AdminFieldGrid,
  AdminForm,
  AdminOrganizerIntakeCheckboxField,
  AdminToolbar,
  Panel,
  StateRow,
} from "../../../../shared/ui/AdminPrimitives";
import {nominatorSender, type SupplyNominatorController} from "../controllers/useSupplyNominatorController";

type Role = "associate" | "partner";

const roles: Array<{value: Role; label: string}> = [
  {value: "associate", label: "Sales associate (staff)"},
  {value: "partner", label: "Partner"},
];
const cities = [{value: "", label: "No default city"},
  ...launchMarkets.map((market) => ({value: market.publicPageCitySlug, label: market.cityName}))];
const PHONE = /^\+[1-9][0-9]{6,14}$/u;
const HANDLE = /^[a-z0-9._]{1,30}$/u;

type Channel = "whatsapp" | "instagram";

const channels: Array<{value: Channel; label: string}> = [
  {value: "whatsapp", label: "WhatsApp"},
  {value: "instagram", label: "Instagram"},
];

/** A pasted "@Name.Here" or profile link, as the lowercase username the backend stores. */
function instagramUsername(value: string): string {
  return value.trim().replace(/^(?:https?:\/\/)?(?:www\.)?instagram\.com\//iu, "").replace(/^@/u, "")
    .replace(/[/?#].*$/u, "").toLowerCase();
}

/**
 * Who may nominate organizers by sending links to Catch's WhatsApp number or
 * Instagram account. Anyone else who messages Catch reaches the support inbox.
 */
export function renderSupplyNominators(controller: SupplyNominatorController) {
  return <SupplyNominators controller={controller} />;
}

function SupplyNominators({controller}: {controller: SupplyNominatorController}) {
  const [adding, setAdding] = useState(false);
  return <Panel title="Nominators" icon={null}>
    <CatchText as="p" variant="supporting">Links these people send to Catch's WhatsApp number or Instagram account
      become organizer nominations. A complete listing from a sales associate publishes on its own; the rest wait for
      review here. Messages from anyone else go to the support inbox.</CatchText>
    {controller.page.isPending ? <CatchText as="p" variant="supporting">Loading nominators…</CatchText> : null}
    {controller.page.error ? <CatchText as="p" variant="supporting" role="alert">
      Nominators could not be loaded. Try again.</CatchText> : null}
    {!controller.page.isPending && !controller.page.error && controller.nominators.length === 0 ?
      <CatchText as="p" variant="supporting">Nobody can nominate by message yet.</CatchText> : null}
    {controller.nominators.map((nominator) => <CatchAdminIntakeSection key={nominator.nominatorId}>
      <StateRow label={`${nominator.displayName} · ${nominatorSender(nominator).replace(/^the /u, "")}`} value={
        <CatchBadge recipe="status" tone={nominator.active ? "success" : "neutral"}
          label={nominator.active ? "Can nominate" : "Switched off"} />} />
      <CatchText as="p" variant="supporting">
        {nominator.role === "associate" ? "Sales associate" : "Partner"}
        {nominator.defaultMarket ? ` · ${cityLabel(nominator.defaultMarket)} by default` : ""}
      </CatchText>
    </CatchAdminIntakeSection>)}
    {adding ? <NominatorForm controller={controller} onClose={() => setAdding(false)} /> :
      <AdminToolbar><AdminButton onClick={() => setAdding(true)}>Add or change a nominator</AdminButton></AdminToolbar>}
  </Panel>;
}

function NominatorForm({controller, onClose}: {controller: SupplyNominatorController; onClose: () => void}) {
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
    const done = await controller.save({...endpoint, uid: uid.trim(), role, displayName: displayName.trim(),
      defaultMarket: city || null, active});
    if (done) onClose();
  };
  return <AdminForm onSubmit={(event) => {event.preventDefault(); void submit();}}>
    <AdminFieldGrid>
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
      <CatchField recipe="select" title="Default city" value={city} values={cities.map((entry) => entry.value)}
        itemLabelBuilder={(value) => cities.find((entry) => entry.value === value)?.label ?? value}
        onChanged={(value) => setCity(value ?? "")} />
      <CatchField recipe="input" title="Catch account id" maxLength={128} value={uid} onChanged={setUid}
        helperText="The staff or partner account their nominations are credited to." />
    </AdminFieldGrid>
    {controller.myUid ? <AdminToolbar>
      <AdminButton onClick={() => setUid(controller.myUid ?? "")}>Use my account</AdminButton>
    </AdminToolbar> : null}
    <AdminOrganizerIntakeCheckboxField label="Can nominate" checked={active} onChange={setActive} />
    <AdminToolbar>
      <AdminButton type="submit" variant="primary" disabled={!ready || controller.isSaving}>Save</AdminButton>
      <AdminButton onClick={onClose}>Cancel</AdminButton>
    </AdminToolbar>
  </AdminForm>;
}

function cityLabel(slug: string): string {
  return cities.find((entry) => entry.value === slug)?.label ?? slug;
}
