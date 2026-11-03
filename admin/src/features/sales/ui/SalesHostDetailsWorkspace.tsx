import {
  CatchButton, CatchEmptyState, CatchField, CatchGap, CatchIndexRow, CatchSection, CatchSheet, CatchText,
} from "@catch/web-ui";
import {useState} from "react";
import type {SalesAccountDetail, SalesCustomFieldDefinition} from "../api/salesTypes";
import {selectChoices} from "../controllers/salesLabels";

export interface SalesHostDetailsModel {
  privateFields: SalesCustomFieldDefinition[];
  privateFieldsLoading: boolean;
  privateFieldsFailed: boolean;
  retryPrivateFields: () => void;
  saveCustomValue: (fieldId: string, expectedRevision: number, value: string | number | boolean) => Promise<boolean>;
  isSaving: boolean;
}

function valueLabel(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined || value === "") return "Not set";
  return typeof value === "boolean" ? (value ? "Yes" : "No") : String(value);
}

/** Saves against the revision it opened with, and says so if someone else changed the value meanwhile. */
function ChangeValueSheet({field, host, model, onClose}: {
  field: SalesCustomFieldDefinition; host: SalesAccountDetail; model: SalesHostDetailsModel; onClose: () => void;
}) {
  const current = host.customValues?.find((item) => item.fieldId === field.fieldId);
  const [text, setText] = useState(() => String(current?.value ?? ""));
  const [revision, setRevision] = useState(current?.revision ?? 0);
  const changedElsewhere = (current?.revision ?? 0) !== revision;
  const validNumber = field.type !== "number" || (text.trim() !== "" && Number.isFinite(Number(text)));
  const ready = text.trim() !== "" && validNumber && !changedElsewhere && !model.isSaving;
  const save = async () => {
    const value = field.type === "number" ? Number(text) : field.type === "boolean" ? text === "true" : text.trim();
    if (await model.saveCustomValue(field.fieldId, revision, value)) onClose();
  };
  const helper = field.helpText ? {helperText: field.helpText} : {};
  return (
    <CatchSheet recipe="standard" pinFooter open onClose={onClose} title={field.label} subtitle={host.organizerSummary.name}
      footer={<CatchButton label="Save" fullWidth onPressed={ready ? () => void save() : null} />}>
      <CatchGap size="related">
        {field.type === "enum" ? <CatchField recipe="select" title={field.label} value={text} onChanged={(value) => setText(value ?? "")}
          {...helper} {...selectChoices([{value: "", label: "Choose"}, ...(field.enumOptions ?? []).map((option) => ({value: option, label: option}))])} /> :
          field.type === "boolean" ? <CatchField recipe="select" title={field.label} value={text} onChanged={(value) => setText(value ?? "")}
            {...helper} {...selectChoices([{value: "", label: "Unknown"}, {value: "true", label: "Yes"}, {value: "false", label: "No"}])} /> :
            <CatchField recipe="input" title={field.label} value={text} onChanged={setText} {...helper}
              keyboardType={field.type === "number" ? "decimal" : field.type === "date" ? "date" : "text"} />}
        {!validNumber && text.trim() ? <CatchText as="p" variant="supporting" role="alert">Enter a valid number.</CatchText> : null}
        {changedElsewhere ? <>
          <CatchText as="p" variant="supporting" role="alert">
            Someone else changed this. It's now: {valueLabel(current?.value)}.
          </CatchText>
          <CatchButton label="Use the latest value" variant="secondary" size="sm" onPressed={() => {
            setText(String(current?.value ?? ""));
            setRevision(current?.revision ?? 0);
          }} />
        </> : null}
      </CatchGap>
    </CatchSheet>
  );
}

/** A host's private fields, defined in Settings → Sales. Hosts never see them. */
export function SalesHostDetailsWorkspace({host, model}: {host: SalesAccountDetail; model: SalesHostDetailsModel}) {
  const [changing, setChanging] = useState<SalesCustomFieldDefinition | null>(null);
  return (
    <CatchSection title="Private details" count={model.privateFields.length} dividers="none"
      empty={model.privateFieldsFailed ? <CatchEmptyState title="Private details could not be loaded"
        actions={<CatchButton label="Try again" variant="secondary" size="sm" onPressed={model.retryPrivateFields} />} /> :
        model.privateFieldsLoading ? <CatchEmptyState title="Loading private details…" /> :
          <CatchEmptyState title="No private fields yet" message="Add them in Settings, under Sales." />}>
      {model.privateFields.map((field) => <CatchIndexRow key={field.fieldId} title={field.label} titleVariant="bodyM"
        subtitle={valueLabel(host.customValues?.find((item) => item.fieldId === field.fieldId)?.value)}
        trailing={<CatchButton label="Change" variant="secondary" size="sm" onPressed={() => setChanging(field)} />} />)}
      {changing ? <ChangeValueSheet field={changing} host={host} model={model} onClose={() => setChanging(null)} /> : null}
    </CatchSection>
  );
}
