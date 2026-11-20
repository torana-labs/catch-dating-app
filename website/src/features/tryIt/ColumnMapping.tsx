import {CatchField, CatchStack, CatchText} from "@catch/web-ui";
import type {ReactNode} from "react";

/**
 * A column choice for an uploaded table: one select per field, each
 * offering the file's columns by name (with what the column holds, when
 * the command says) or "not in this file". It owns no words and no state:
 * the caller passes its copy, the current choice and what to do on a
 * change, so any upload tool whose command answers with `headers` and
 * asks for a column per field can use it.
 */
export interface ColumnMappingField<F extends string> {
  readonly id: F;
  readonly label: string;
  readonly required?: boolean;
}

export interface ColumnMappingWords {
  /** The select's label for a field, from the field's label. */
  readonly fieldLabel: (label: string) => string;
  /** The empty choice, which leaves the field unmapped. */
  readonly none: string;
  /** A column's name in the list, with what it holds when known. */
  readonly column: (header: string, hint: string | null) => string;
  /** A column with no header, by its 1-based number. */
  readonly untitled: (number: number) => string;
}

export interface ColumnMappingProps<F extends string> {
  readonly fields: readonly ColumnMappingField<F>[];
  readonly headers: readonly string[];
  /** What each column holds, in words, by column index; null when unknown. */
  readonly hints?: readonly (string | null)[];
  readonly value: Readonly<Record<F, number | null>>;
  readonly onChanged: (field: F, column: number | null) => void;
  readonly words: ColumnMappingWords;
  readonly busy?: boolean;
  /** Why the choice cannot be sent yet, under the selects. */
  readonly errorText?: string | null;
}

function ColumnMappingFields<F extends string>({fields, headers, hints = [], value, onChanged, words, busy = false, errorText}: ColumnMappingProps<F>) {
  const columns = headers.map((_, index) => index);
  const label = (column: number) => words.column(headers[column]?.trim() || words.untitled(column + 1), hints[column] ?? null);
  return (
    <CatchStack gap={12}>
      {fields.map((field) => (
        <CatchField<number> hintText={words.none} inputMode={busy ? "inactive" : "editable"} itemLabelBuilder={label}
          itemValueBuilder={String} key={field.id} labelMode="visible" onChanged={(column) => onChanged(field.id, column)}
          recipe="select" required={field.required} title={words.fieldLabel(field.label)} value={value[field.id]} values={columns} />
      ))}
      {errorText ? <CatchText as="p" role="alert" tone="danger" variant="body-small">{errorText}</CatchText> : null}
    </CatchStack>
  );
}

/** The column choice as a node, so a tool's view can place it inside its own form. */
export function columnMappingFields<F extends string>(props: ColumnMappingProps<F>): ReactNode {
  return <ColumnMappingFields {...props} />;
}
