import {
  CatchButton, CatchEmptyState, CatchField, CatchGap, CatchIndexRow, CatchSection, CatchSheet, CatchText, CatchWorkspaceHeader,
} from "@catch/web-ui";
import {useState} from "react";
import type {SalesCustomFieldDefinition, SalesCustomFieldType} from "../api/salesTypes";
import {selectChoices} from "../controllers/salesLabels";
import {salesImportSummary, type SalesImportGroup} from "../controllers/salesImports";
import {useSalesSettingsController, type SalesSettingsController} from "../controllers/useSalesSettingsController";
import {SalesImportCorrectionWorkspace} from "./SalesImportCorrectionWorkspace";
import {SalesImportSheetWorkspace} from "./SalesImportSheetWorkspace";

const typeLabels: Record<SalesCustomFieldType, string> = {
  string: "Text", number: "Number", boolean: "Yes or no", date: "Date", enum: "A choice",
};

function customFieldId(label: string): string {
  const slug = label.trim().normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/gu, "_").replace(/^_+|_+$/gu, "");
  return slug ? `sales.${slug}` : "";
}

/** "A choice: Luma, BookMyShow · which one they use". */
function fieldSummary(field: Pick<SalesCustomFieldDefinition, "type" | "helpText" | "enumOptions">): string {
  const options = field.type === "enum" && field.enumOptions?.length ? `: ${field.enumOptions.join(", ")}` : "";
  return `${typeLabels[field.type]}${options}${field.helpText ? ` · ${field.helpText}` : ""}`;
}

function AddFieldSheet({controller, fields, onClose}: {
  controller: SalesSettingsController; fields: readonly SalesCustomFieldDefinition[]; onClose: () => void;
}) {
  const [label, setLabel] = useState("");
  const [type, setType] = useState<SalesCustomFieldType>("string");
  const [helpText, setHelpText] = useState("");
  const [choices, setChoices] = useState("");
  const [problem, setProblem] = useState("");
  const id = customFieldId(label);
  const similar = label.trim().length < 3 ? [] : fields.filter((field) => field.fieldId === id ||
    field.label.toLocaleLowerCase().includes(label.trim().toLocaleLowerCase()));
  const enumOptions = choices.split(",").map((value) => value.trim()).filter(Boolean);
  const save = async () => {
    if (!id) { setProblem("Enter a field label with letters or numbers."); return; }
    if (type === "enum" && !enumOptions.length) { setProblem("Add at least one choice for this field."); return; }
    if (fields.some((field) => field.fieldId === id)) { setProblem("A field with this name already exists."); return; }
    setProblem("");
    const saved = await controller.addField({field: {fieldId: id, label: label.trim(), type, recordType: "account",
      ...(helpText.trim() ? {helpText: helpText.trim()} : {}), ...(type === "enum" ? {enumOptions} : {})}});
    if (saved) onClose();
  };
  return (
    <CatchSheet recipe="standard" pinFooter open onClose={onClose} title="Add a field" subtitle="Settings · Sales"
      footer={<CatchButton fullWidth label="Add field" onPressed={controller.isSaving ? null : () => void save()} />}>
      <CatchGap size="formField">
        <CatchText as="p" variant="supporting">
          Add a field when the team needs the same information for several hosts. A field can't be changed once added.
        </CatchText>
        <CatchField recipe="input" title="Field label" value={label} onChanged={setLabel}
          inputHint="For example, preferred demo language" />
        {similar.length ? <CatchText as="p" variant="supporting" role="status">
          Similar fields: {similar.map((field) => field.label).join(", ")}. Check these before adding another.</CatchText> : null}
        <CatchField recipe="select" title="Type" value={type} onChanged={(value) => setType((value ?? "string") as SalesCustomFieldType)}
          {...selectChoices((Object.entries(typeLabels) as Array<[SalesCustomFieldType, string]>).map(([value, text]) => ({value, label: text})))} />
        {type === "enum" ? <CatchField recipe="input" title="Choices, separated by commas" value={choices} onChanged={setChoices} /> : null}
        <CatchField recipe="input" title="Help text" maxLines={2} value={helpText} onChanged={setHelpText} />
        <CatchSection title="Preview">
          <CatchIndexRow title={label.trim() || "Field label"} titleVariant="bodyM"
            subtitle={fieldSummary({type, helpText: helpText.trim(), enumOptions})} />
        </CatchSection>
        {problem ? <CatchText as="p" variant="supporting" role="alert">{problem}</CatchText> : null}
      </CatchGap>
    </CatchSheet>
  );
}

function FieldsSection({controller, onAdd}: {controller: SalesSettingsController; onAdd: () => void}) {
  const {customFields} = controller;
  const rows = customFields.data?.rows ?? [];
  return (
    <CatchSection title="Private host fields" count={rows.length} container="tile" action={{label: "Add a field", onPressed: onAdd}}>
      {customFields.isError ? <CatchEmptyState title="Fields could not be loaded"
        actions={<CatchButton label="Try again" variant="secondary" size="sm" onPressed={() => void customFields.refetch()} />} /> : null}
      {customFields.isPending ? <CatchText as="p" variant="supporting">Loading fields…</CatchText> : null}
      {customFields.isSuccess && !rows.length ? <CatchEmptyState title="No private fields yet"
        message="Sales fill these in on a host. Hosts never see them." /> : null}
      {rows.map((field) => <CatchIndexRow key={field.fieldId} title={field.label} titleVariant="bodyM" subtitle={fieldSummary(field)} />)}
    </CatchSection>
  );
}

function ImportsSection({canCorrect, controller, currentUserUid, onCorrect, onImport}: {
  canCorrect: boolean; controller: SalesSettingsController; currentUserUid: string | null;
  onCorrect: (group: SalesImportGroup) => void; onImport: () => void;
}) {
  const {groups, imports} = controller;
  return (
    <CatchSection title="Imports" count={groups.length} container="tile" action={{label: "Import a CSV", onPressed: onImport}}>
      {imports.isError ? <CatchEmptyState title="Imports could not be loaded"
        actions={<CatchButton label="Try again" variant="secondary" size="sm" onPressed={() => void imports.refetch()} />} /> : null}
      {imports.isPending ? <CatchText as="p" variant="supporting">Loading imports…</CatchText> : null}
      {imports.isSuccess && !groups.length ? <CatchEmptyState title="No imports yet" /> : null}
      {groups.map((group) => <CatchIndexRow key={group.sourceId} title={group.name} titleVariant="bodyM"
        subtitle={salesImportSummary(group, currentUserUid)}
        {...(canCorrect ? {trailing: <CatchButton label="Correct" variant="secondary" size="sm" onPressed={() => onCorrect(group)} />} : {})} />)}
      {imports.hasNextPage ? <CatchButton recipe="text" label="Show older imports"
        onPressed={imports.isFetchingNextPage ? null : () => void imports.fetchNextPage()} /> : null}
    </CatchSection>
  );
}

function PrivacySection({controller, onOpen}: {controller: SalesSettingsController; onOpen: (organizerId: string) => void}) {
  const {privacyMatches: matches, privacyQuery, privacyText, setPrivacyText} = controller;
  return (
    <CatchSection title="Find a host privacy case" note="Owner only · opens that host's privacy page">
      <CatchGap size="related">
        <CatchField recipe="input" title="Host name" value={privacyText} onChanged={setPrivacyText}
          helperText="Includes hosts no longer in Sales. Opening one changes nothing." />
        {privacyQuery.length >= 2 && matches.isPending ? <CatchText as="p" variant="supporting" role="status">Searching hosts…</CatchText> : null}
        {matches.isError ? <CatchEmptyState title="Host search failed"
          actions={<CatchButton label="Try again" variant="secondary" size="sm" onPressed={() => void matches.refetch()} />} /> : null}
        {matches.data?.length === 0 ? <CatchEmptyState title="No matching hosts" /> : null}
        {matches.data?.map((row) => <CatchIndexRow key={row.organizerId} title={row.name} titleVariant="bodyM"
          {...(row.cityName ? {subtitle: row.cityName} : {})} onTap={() => onOpen(row.organizerId)} />)}
      </CatchGap>
    </CatchSection>
  );
}

/** Settings → Sales. Assigned sales associates don't reach Settings, so this is the team's view. */
export function SalesSettingsRouteScreen({canCorrect, currentUserUid, onError, onNotice, onOpenPrivacy}: {
  canCorrect: boolean;
  currentUserUid: string | null;
  onError: (message: string | null) => void;
  onNotice: (message: string | null) => void;
  onOpenPrivacy: (organizerId: string) => void;
}) {
  const controller = useSalesSettingsController({canCorrect, onError, onNotice});
  const [addingField, setAddingField] = useState(false);
  const [importing, setImporting] = useState(false);
  const [correcting, setCorrecting] = useState<SalesImportGroup | null>(null);
  return (
    <>
      <CatchWorkspaceHeader title="Sales" kicker="Settings" />
      <CatchGap size="section">
        <FieldsSection controller={controller} onAdd={() => setAddingField(true)} />
        <ImportsSection canCorrect={canCorrect} controller={controller} currentUserUid={currentUserUid}
          onCorrect={setCorrecting} onImport={() => setImporting(true)} />
        {canCorrect ? <PrivacySection controller={controller} onOpen={onOpenPrivacy} /> : null}
      </CatchGap>
      {addingField ? <AddFieldSheet controller={controller} fields={controller.customFields.data?.rows ?? []}
        onClose={() => setAddingField(false)} /> : null}
      {importing ? <SalesImportSheetWorkspace applyImport={controller.applyImport} isSaving={controller.isSaving}
        onClose={() => setImporting(false)} /> : null}
      {correcting ? <SalesImportCorrectionWorkspace applyCorrection={controller.applyCorrection} group={correcting}
        isSaving={controller.isSaving} onClose={() => setCorrecting(null)} /> : null}
    </>
  );
}
