import {
  type ChangeEvent,
  type FocusEvent,
  type KeyboardEvent,
  type ReactNode,
  useId,
  useState,
} from "react";
import styles from "./CatchField.module.css";

/** Flutter `CatchFieldLabelTextMode`; hidden labels keep their accessible name. */
export type CatchFieldLabelTextMode = "visible" | "hidden";

/** Flutter `CatchFieldSupportRowTone` for helper text. */
export type CatchFieldSupportRowTone = "neutral" | "brand" | "success";

/** Flutter `CatchTextInputMode`: whether the value can be edited or focused. */
export type CatchTextInputMode = "editable" | "readOnly" | "inactive";

/** Flutter `CatchTextInputVariant`; obscured hides the value (passwords). */
export type CatchTextInputVariant = "plain" | "obscured";

/**
 * Keyboard and value kind, named after Flutter's `TextInputType`. `number`
 * and `decimal` only choose the keyboard, as in Flutter, so codes keep their
 * leading zeros; give `min`, `max` or `step` to get a native number value.
 * `date` and `time` are web pickers with no Flutter keyboard equivalent.
 */
export type CatchFieldKeyboardType =
  | "text"
  | "emailAddress"
  | "phone"
  | "url"
  | "number"
  | "decimal"
  | "datetime"
  | "date"
  | "time";

/** Native attributes the web form needs that have no Flutter counterpart. */
interface CatchFieldNativeProps {
  autoComplete?: string;
  form?: string;
  id?: string;
  name?: string;
  required?: boolean;
}

interface CatchFieldCommonProps extends CatchFieldNativeProps {
  /** Replaces the helper text and marks the field invalid. */
  errorText?: string | null;
  helperText?: string | null;
  helperTone?: CatchFieldSupportRowTone;
  inputMode?: CatchTextInputMode;
  labelMode?: CatchFieldLabelTextMode;
  /** A leading glyph in the row's icon lane, as Flutter's `leading`. */
  leading?: ReactNode;
  /** The field label. */
  title: string;
}

export interface CatchFieldInputProps extends CatchFieldCommonProps {
  autofocus?: boolean;
  /** Uncontrolled starting value. */
  initialValue?: string;
  inputHint?: string;
  inputVariant?: CatchTextInputVariant;
  keyboardType?: CatchFieldKeyboardType;
  max?: number | string;
  /** One line by default; more, or null for unbounded, renders a text area. */
  maxLines?: number | null;
  maxLength?: number;
  min?: number | string;
  /** Text area height in lines; defaults to maxLines, else three. */
  minLines?: number;
  minLength?: number;
  onBlur?: (value: string) => void;
  onChanged?: (value: string) => void;
  /** Enter in a single-line field. */
  onSubmitted?: (value: string) => void;
  pattern?: string;
  /** Fixed text before the value, such as a "+91" dialling code; read with the field. */
  prefixText?: string;
  recipe: "input";
  step?: number | string;
  /** Fixed text after the value, such as a unit. */
  suffixText?: string;
  value?: string;
}

export interface CatchFieldSelectProps<T> extends CatchFieldCommonProps {
  /** An empty first choice that selects null. */
  hintText?: string;
  /** Uncontrolled starting choice, for forms read through FormData. */
  initialValue?: T | null;
  itemLabelBuilder: (item: T) => string;
  /** The option key; required when values are not strings. */
  itemValueBuilder?: (item: T) => string;
  onBlur?: () => void;
  onChanged?: (value: T | null) => void;
  recipe: "select";
  /** The controlled choice; omit it and use initialValue for an uncontrolled select. */
  value?: T | null;
  values: readonly T[];
}

export type CatchFieldProps<T = string> = CatchFieldInputProps | CatchFieldSelectProps<T>;

const nativeKeyboard: Record<CatchFieldKeyboardType, {type: string; inputMode?: "decimal" | "email" | "numeric" | "tel" | "url"}> = {
  text: {type: "text"},
  emailAddress: {type: "email", inputMode: "email"},
  phone: {type: "tel", inputMode: "tel"},
  url: {type: "url", inputMode: "url"},
  number: {type: "text", inputMode: "numeric"},
  decimal: {type: "text", inputMode: "decimal"},
  datetime: {type: "datetime-local"},
  date: {type: "date"},
  time: {type: "time"},
};

/**
 * A labelled form field in one recipe of Flutter's `CatchField`: `input` for
 * text (a text area when it spans lines) and `select` for one of a list. The
 * field paints a quiet row at rest and an active tile while focused; the
 * caller passes resolved copy. Inside a `CatchGroundCard` it takes the Website
 * v2 boards' boxed input at rest instead, from the card's
 * `--catch-field-rest-*` properties.
 */
export function CatchField<T = string>(props: CatchFieldProps<T>) {
  const generatedId = useId();
  const id = props.id ?? `catch-field-${generatedId}`;
  const supportId = `${id}-support`;
  const affixIds = {prefix: `${id}-prefix`, suffix: `${id}-suffix`};
  const [focused, setFocused] = useState(false);
  const [uncontrolledLength, setUncontrolledLength] = useState(
    props.recipe === "input" ? (props.initialValue ?? "").length : 0,
  );
  const inputMode = props.inputMode ?? "editable";
  const error = props.errorText?.trim() ? props.errorText.trim() : null;
  const support = error ?? (props.helperText?.trim() ? props.helperText.trim() : null);
  const labelHidden = props.labelMode === "hidden";

  const focusHandlers = {
    onFocus: () => setFocused(true),
  };

  let control: ReactNode;
  let counter: string | null = null;
  let counterVisible = false;
  if (props.recipe === "input") {
    const multiline = props.maxLines !== 1 && props.maxLines !== undefined;
    const length = props.value !== undefined ? props.value.length : uncontrolledLength;
    if (props.maxLength !== undefined) {
      counter = `${length} / ${props.maxLength}`;
      counterVisible = focused || error !== null;
    }
    const prefix = props.prefixText?.trim() ? props.prefixText : undefined;
    const suffix = props.suffixText?.trim() ? props.suffixText : undefined;
    const describedBy = [prefix ? affixIds.prefix : null, suffix ? affixIds.suffix : null, support ? supportId : null]
      .filter(Boolean).join(" ");
    const common = {
      "aria-describedby": describedBy || undefined,
      "aria-invalid": error ? true : undefined,
      autoComplete: props.autoComplete,
      autoFocus: props.autofocus,
      className: styles.control,
      defaultValue: props.initialValue,
      disabled: inputMode === "inactive",
      form: props.form,
      id,
      maxLength: props.maxLength,
      minLength: props.minLength,
      name: props.name,
      placeholder: props.inputHint,
      readOnly: inputMode === "readOnly",
      required: props.required,
      value: props.value,
      ...focusHandlers,
      onBlur: (event: FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFocused(false);
        props.onBlur?.(event.currentTarget.value);
      },
      onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        if (props.value === undefined) setUncontrolledLength(event.currentTarget.value.length);
        props.onChanged?.(event.currentTarget.value);
      },
    };
    if (multiline) {
      control = (
        <textarea
          {...common}
          rows={props.minLines ?? props.maxLines ?? 3}
        />
      );
    } else {
      const keyboard = nativeKeyboard[props.keyboardType ?? "text"];
      const numericRange = props.min !== undefined || props.max !== undefined || props.step !== undefined;
      control = (
        <input
          {...common}
          inputMode={keyboard.inputMode}
          max={props.max}
          min={props.min}
          onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
            if (event.key === "Enter" && props.onSubmitted) props.onSubmitted(event.currentTarget.value);
          }}
          pattern={props.pattern}
          step={props.step}
          type={props.inputVariant === "obscured"
            ? "password"
            : numericRange && keyboard.inputMode !== undefined && ["numeric", "decimal"].includes(keyboard.inputMode)
              ? "number"
              : keyboard.type}
        />
      );
    }
    if (prefix || suffix) {
      // Flutter draws prefixText and suffixText inline with the value, in the
      // secondary ink; the input is described by both.
      control = (
        <span className={styles.affixLane}>
          {prefix ? <span className={styles.affix} id={affixIds.prefix}>{prefix}</span> : null}
          {control}
          {suffix ? <span className={styles.affix} id={affixIds.suffix}>{suffix}</span> : null}
        </span>
      );
    }
  } else {
    const select = props;
    const keyOf = select.itemValueBuilder ?? ((item: T) => String(item));
    const controlled = select.value !== undefined;
    const current = controlled ? select.value : select.initialValue;
    const selectedKey = current === null || current === undefined ? "" : keyOf(current);
    // An unset value needs an empty choice unless one of the values is empty.
    const showsEmptyChoice = select.hintText !== undefined ||
      (selectedKey === "" && !select.values.some((item) => keyOf(item) === ""));
    control = (
      <span className={styles.selectLane}>
        <select
          aria-describedby={support ? supportId : undefined}
          aria-invalid={error ? true : undefined}
          autoComplete={select.autoComplete}
          className={styles.control}
          disabled={inputMode === "inactive"}
          form={select.form}
          id={id}
          name={select.name}
          defaultValue={controlled ? undefined : selectedKey}
          required={select.required}
          value={controlled ? selectedKey : undefined}
          {...focusHandlers}
          onBlur={() => {
            setFocused(false);
            select.onBlur?.();
          }}
          onChange={(event) => {
            const next = select.values.find((item) => keyOf(item) === event.currentTarget.value);
            select.onChanged?.(next ?? null);
          }}
        >
          {showsEmptyChoice ? (
            <option value="">{select.hintText ?? ""}</option>
          ) : null}
          {select.values.map((item) => {
            const key = keyOf(item);
            return <option key={key} value={key}>{select.itemLabelBuilder(item)}</option>;
          })}
        </select>
        <svg aria-hidden="true" className={styles.chevron} focusable="false" viewBox="0 0 16 16">
          <path d="M4 6l4 4 4-4" />
        </svg>
      </span>
    );
  }

  return (
    <div
      className={styles.field}
      data-focused={focused || undefined}
      data-input-mode={inputMode}
      data-leading={props.leading ? "" : undefined}
      data-recipe={props.recipe}
      data-status={error ? "error" : undefined}
    >
      {props.leading ? <span aria-hidden="true" className={styles.leading}>{props.leading}</span> : null}
      <label className={labelHidden ? styles.hiddenLabel : styles.caption} htmlFor={id}>
        {props.title}
      </label>
      {control}
      {support || counter ? (
        <div className={styles.support}>
          {support ? (
            <p
              className={styles.supportText}
              data-tone={error ? "danger" : props.helperTone ?? "neutral"}
              id={supportId}
              role={error ? "alert" : undefined}
            >
              {support}
            </p>
          ) : null}
          {/* The counter keeps its row while hidden: a focus change must not
              move the controls below, or a click whose press and release
              land on different elements is lost. */}
          {counter ? (
            <span aria-hidden="true" className={styles.counter}
              data-visible={counterVisible || undefined}>{counter}</span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
