"use client";

import {useState, type CSSProperties} from "react";
import styles from "./CatchCodeInput.module.css";

/** Flutter `CatchCodeInputStatus`. */
export type CatchCodeInputStatus = "ready" | "error";

/**
 * Flutter `CatchContractFieldConstraints`: the generated data-contract limits
 * for one field. A code input reads its exact length from `maxLength`.
 */
export interface CatchContractFieldConstraints {
  enumValues?: readonly string[];
  format?: string;
  itemEnumValues?: readonly string[];
  itemValueTypes?: readonly string[];
  maxItems?: number;
  maxLength?: number;
  maximum?: number;
  minItems?: number;
  minLength?: number;
  minimum?: number;
  multipleOf?: number;
  path: string;
  pattern?: string;
  required?: boolean;
  uniqueItems?: boolean;
  valueTypes?: readonly string[];
}

export interface CatchCodeInputProps {
  /** Pins the highlighted cell; by default it follows the next empty cell. */
  active?: number;
  autofocus?: boolean;
  /** Shows the blinking caret in the active empty cell. Defaults to true. */
  caret?: boolean;
  /** The data contract whose exact `maxLength` sets the code length. */
  contract?: CatchContractFieldConstraints;
  /** Why this code has no data contract. */
  contractExemption?: string;
  /** Space between cells in px; defaults to 10. */
  gap?: number;
  /** Cell height in px; defaults to 64. */
  height?: number;
  /** Cells when there is no contract; defaults to 6. */
  length?: number;
  onChanged: (value: string) => void;
  /** Called with the code on Enter. */
  onSubmitted: (value: string) => void;
  /** The input's accessible name, such as "6-digit code sent to 98765 43210". */
  semanticsLabel: string;
  /** Defaults to ready; error outlines every cell. */
  status?: CatchCodeInputStatus;
  /** Web only: a controlled code, in place of Flutter's controller. */
  value?: string;
}

const digitsOnly = (text: string, length: number) => text.replace(/\D/g, "").slice(0, length);

/**
 * A one-time code: fixed digit cells over one real input, so paste, SMS
 * autofill, keyboards and screen readers all use a single text field.
 */
export function CatchCodeInput({
  active,
  autofocus = false,
  caret = true,
  contract,
  gap,
  height,
  length,
  onChanged,
  onSubmitted,
  semanticsLabel,
  status = "ready",
  value,
}: CatchCodeInputProps) {
  const cells = contract?.maxLength ?? length ?? 6;
  const [own, setOwn] = useState("");
  const code = digitsOnly(value ?? own, cells);
  const done = code.length >= cells;
  const activeIndex = active ?? Math.min(code.length, cells - 1);
  const geometry = {
    ...(gap === undefined ? {} : {"--catch-code-gap": `${gap}px`}),
    ...(height === undefined ? {} : {"--catch-code-height": `${height}px`}),
  } as CSSProperties;
  return (
    <div className={styles.code} data-status={status} style={geometry}>
      <div aria-hidden="true" className={styles.cells}>
        {Array.from({length: cells}, (_, index) => {
          const isActive = !done && index === activeIndex;
          return (
            <span className={styles.cell} data-active={isActive || undefined} key={index}>
              {code[index] ?? (isActive && caret ? <span className={styles.caret} /> : null)}
            </span>
          );
        })}
      </div>
      <input
        aria-invalid={status === "error" || undefined}
        aria-label={semanticsLabel}
        autoComplete="one-time-code"
        autoFocus={autofocus}
        className={styles.input}
        enterKeyHint="done"
        inputMode="numeric"
        maxLength={cells}
        onChange={(event) => {
          const next = digitsOnly(event.target.value, cells);
          if (value === undefined) setOwn(next);
          onChanged(next);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") onSubmitted(code);
        }}
        pattern="[0-9]*"
        type="text"
        value={code}
      />
    </div>
  );
}
