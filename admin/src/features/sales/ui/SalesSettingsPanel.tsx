import {CatchText, CatchField} from "@catch/web-ui";
import {useState} from "react";
import {ClipboardList} from "lucide-react";
import {
  AdminButton,
  AdminForm,
  EmptyState,
  Panel,
  selectOptions,
  StateRow,
} from "../../../shared/ui/AdminPrimitives";
import type {SalesWorkspaceController} from
  "../controllers/useSalesWorkspaceController";
import type {SalesCustomFieldType} from "../api/salesTypes";
import {SalesImportWorkspace} from "./SalesImportPanel";

const typeLabels: Record<SalesCustomFieldType, string> = {
  string: "Text", number: "Number", boolean: "Yes or no", date: "Date",
  enum: "Choice",
};

function customFieldId(label: string): string {
  const slug = label.trim().normalize("NFKD").toLowerCase()
    .replace(/[^a-z0-9]+/gu, "_").replace(/^_+|_+$/gu, "");
  return slug ? `sales.${slug}` : "";
}

function SettingsView({controller, isAdminOwner}: {
  controller: SalesWorkspaceController; isAdminOwner: boolean;
}) {
  const [label, setLabel] = useState("");
  const [type, setType] = useState<SalesCustomFieldType>("string");
  const [helpText, setHelpText] = useState("");
  const [enumText, setEnumText] = useState("");
  const [localError, setLocalError] = useState("");
  const fields = controller.customFields.data?.rows ?? [];
  const id = customFieldId(label);
  const similar = fields.filter((field) => field.fieldId === id ||
    field.label.toLocaleLowerCase().includes(label.trim().toLocaleLowerCase()))
    .filter(() => label.trim().length >= 3);
  const enumOptions = enumText.split(",").map((value) => value.trim())
    .filter(Boolean);
  const save = async () => {
    if (!id) {setLocalError("Enter a field label with letters or numbers."); return;}
    if (type === "enum" && !enumOptions.length) {
      setLocalError("Add at least one choice for this field."); return;
    }
    if (similar.some((field) => field.fieldId === id)) {
      setLocalError("A field with this name already exists. Review it below.");
      return;
    }
    setLocalError("");
    const saved = await controller.addCustomField({field: {
      fieldId: id, label: label.trim(), type, recordType: "account",
      helpText: helpText.trim() || undefined,
      enumOptions: type === "enum" ? enumOptions : undefined,
    }});
    if (saved) {setLabel(""); setHelpText(""); setEnumText("");}
  };
  return <><Panel title="Sales settings" icon={<ClipboardList size={18} />}>
    <CatchText as="p" variant="supporting">Add a private account field when the team needs the same information for
      several hosts. Check existing fields first.</CatchText>
    {controller.customFields.isPending ? <CatchText as="p" variant="supporting">Loading private fields…</CatchText> : null}
    {controller.customFields.isError ? <EmptyState>
      Fields could not be loaded. <AdminButton
        onClick={() => void controller.customFields.refetch()}>Try again</AdminButton>
    </EmptyState> : null}
    {fields.map((field) => <StateRow key={field.fieldId} label={field.label}
      value={<>{typeLabels[field.type]} · {field.helpText || "No help text"}</>} />)}
    {similar.length ? <CatchText as="p" variant="supporting" role="status">Similar fields: {similar.map((field) =>
      field.label).join(", ")}. Check these before adding another.</CatchText> : null}
    <AdminForm onSubmit={(event) => {event.preventDefault(); void save();}}>
      <CatchText as="h3" variant="sectionTitle">New host field</CatchText>
      <CatchField
        recipe="input"
        title="Field label"
        value={label}
        onChanged={setLabel}
        inputHint="For example, preferred demo language"
      />
      <CatchField
        recipe="select"
        title="Type"
        value={type}
        onChanged={(value) => setType((value ?? "") as SalesCustomFieldType)}
        {...selectOptions([
          {value: "string", label: "Text"},
          {value: "number", label: "Number"},
          {value: "boolean", label: "Yes or no"},
          {value: "date", label: "Date"},
          {value: "enum", label: "Choice"},
        ])}
      />
      {type === "enum" ? <CatchField
        recipe="input"
        title="Choices, separated by commas"
        value={enumText}
        onChanged={setEnumText}
      /> : null}
      <CatchField
        recipe="input"
        title="Help text"
        maxLines={2}
        value={helpText}
        onChanged={setHelpText}
      />
      <CatchText as="p" variant="supporting">Preview: {label.trim() || "Field label"} · {typeLabels[type]}
        {helpText.trim() ? ` · ${helpText.trim()}` : ""}</CatchText>
      {localError ? <CatchText as="p" variant="supporting" role="alert">{localError}</CatchText> : null}
      <AdminButton type="submit" variant="primary" disabled={controller.isSaving}>
        Add private field
      </AdminButton>
    </AdminForm>
  </Panel><SalesImportWorkspace controller={controller} isAdminOwner={isAdminOwner} /></>;
}

export function renderSalesSettingsWorkspace(
  controller: SalesWorkspaceController, isAdminOwner: boolean,
) {
  return <SettingsView controller={controller} isAdminOwner={isAdminOwner} />;
}
