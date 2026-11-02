"use client";

import {useRef} from "react";
import type {ReactNode} from "react";
import {CatchButton} from "./CatchButton";
import type {CatchButtonSize, CatchButtonVariant} from "./CatchButton";

export interface CatchFilePickerButtonProps {
  /** Limits the files offered, as the native input's accept. */
  accept?: string;
  label: string;
  leading?: ReactNode;
  /** The chosen file; null when the choice was cleared. Null disables the button. */
  onChanged: ((file: File | null) => void) | null;
  /** A fuller name that keeps the label's words, as "Choose image for slide 2". */
  semanticsLabel?: string;
  size?: CatchButtonSize;
  variant?: CatchButtonVariant;
}

/**
 * A button that opens the browser's file chooser. Web only: Flutter picks files
 * from its data layer, with no widget of its own. Choosing the same file again
 * reports it again.
 */
export function CatchFilePickerButton({
  accept,
  label,
  leading,
  onChanged,
  semanticsLabel,
  size = "sm",
  variant = "secondary",
}: CatchFilePickerButtonProps) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <CatchButton
        label={label}
        leading={leading}
        onPressed={onChanged ? () => input.current?.click() : null}
        semanticsLabel={semanticsLabel}
        size={size}
        variant={variant}
      />
      <input
        accept={accept}
        aria-label={semanticsLabel ?? label}
        disabled={!onChanged}
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0] ?? null;
          event.target.value = "";
          onChanged?.(file);
        }}
        ref={input}
        type="file"
      />
    </>
  );
}
