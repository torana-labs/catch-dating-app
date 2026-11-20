"use client";

import {type FocusEvent, type KeyboardEvent, useMemo, useRef, useState} from "react";
import {
  catchPhoneCheck,
  catchPhoneCountries,
  catchPhoneCountryOf,
  catchPhoneDialCode,
  type CatchPhoneCountryCode,
  type CatchPhoneProblem,
} from "../phone";
import {CatchAdaptiveSheet} from "./CatchAdaptiveSheet";
import {CatchFieldCountryList} from "./CatchFieldCountryList";
import {CatchIcon} from "./CatchIcon";
import styles from "./CatchField.module.css";

/** What a phone field says, resolved by the caller. `{country}` is replaced by the country's name. */
export interface CatchFieldPhoneCopy {
  /** Names the country-code button and titles the list, such as "Country code". */
  country: string;
  /** The list's search line, such as "Search countries". */
  search: string;
  /** When no country matches the search, such as "No country matches". */
  noMatches: string;
  /** Names the close button when the list opens as a dialog. */
  close: string;
  /** Why a number is refused, shown once the reader leaves the box. */
  problems: Readonly<Record<Exclude<CatchPhoneProblem, "empty">, string>>;
}

/** The number as the field reports it: the dialling code, then the national number as typed. */
function catchFieldPhoneValue(countryCode: CatchPhoneCountryCode, national: string): string {
  const typed = national.trim();
  return typed ? `${catchPhoneDialCode(countryCode)} ${typed}` : "";
}

/** The national part of a reported number, for the box: the dialling code lives in the chip. */
function nationalPart(value: string, dialCode: string): string {
  return value.startsWith(dialCode) ? value.slice(dialCode.length).trimStart() : value;
}

const startsInternational = (typed: string) => /^\s*(\+|00)/u.test(typed);

export interface CatchFieldPhoneLaneProps {
  id: string;
  name?: string;
  form?: string;
  required?: boolean;
  autoFocus?: boolean;
  autoComplete?: string;
  inputHint?: string;
  describedBy?: string;
  invalid: boolean;
  disabled: boolean;
  readOnly: boolean;
  copy: CatchFieldPhoneCopy;
  countryCode: CatchPhoneCountryCode;
  locale: string;
  value: string;
  onValue: (value: string) => void;
  onProblem: (problem: string | null) => void;
  onFocus: () => void;
  onBlur: (value: string) => void;
  onSubmitted?: (value: string) => void;
}

/**
 * The phone recipe's lane (issue #2144): a grey chip with the dialling code,
 * then the number. The chip opens the country list under the field (a sheet on
 * phones). A pasted number with a plus moves the chip to its country. Nothing
 * shows under the box until the number is wrong and the reader has left it.
 */
export function CatchFieldPhone(props: CatchFieldPhoneLaneProps) {
  const {copy, locale, value, onValue, onProblem} = props;
  const lane = useRef<HTMLSpanElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [country, setCountry] = useState<CatchPhoneCountryCode>(() => catchPhoneCountryOf(value) ?? props.countryCode);
  const [open, setOpen] = useState(false);
  const [width, setWidth] = useState<number | undefined>(undefined);
  const [problemShown, setProblemShown] = useState(false);
  const countries = useMemo(() => catchPhoneCountries(locale), [locale]);
  const dialCode = catchPhoneDialCode(country);
  const countryName = countries.find((item) => item.countryCode === country)?.name ?? country;
  const inactive = props.disabled || props.readOnly;

  const problemFor = (reported: string, inCountry: CatchPhoneCountryCode): string | null => {
    const check = catchPhoneCheck(reported, inCountry);
    if (check.status === "valid" || check.problem === "empty") return null;
    const name = countries.find((item) => item.countryCode === check.countryCode)?.name ?? check.countryCode;
    return copy.problems[check.problem].replace("{country}", name);
  };
  const report = (reported: string, inCountry: CatchPhoneCountryCode) => {
    onValue(reported);
    // Once a problem shows, it follows the typing: it clears as soon as the number is right.
    if (problemShown) onProblem(problemFor(reported, inCountry));
  };

  const onChange = (typed: string) => {
    if (startsInternational(typed)) {
      const international = typed.trim().replace(/^00/u, "+");
      const found = catchPhoneCountryOf(international);
      if (found) setCountry(found);
      report(international, found ?? country);
      return;
    }
    report(catchFieldPhoneValue(country, typed), country);
  };
  const pick = (picked: CatchPhoneCountryCode) => {
    setCountry(picked);
    setOpen(false);
    report(catchFieldPhoneValue(picked, nationalPart(value, dialCode)), picked);
    input.current?.focus();
  };

  return (
    <span className={styles.affixLane} data-phone="" ref={lane}>
      <button
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={`${copy.country}: ${countryName} ${dialCode}`}
        className={styles.phoneChip}
        disabled={inactive}
        onClick={() => {
          setWidth(lane.current?.getBoundingClientRect().width || undefined);
          setOpen(true);
        }}
        type="button"
      >
        <span>{dialCode}</span>
        <CatchIcon name="expand" size={16} />
      </button>
      <input
        aria-describedby={props.describedBy}
        aria-invalid={props.invalid || undefined}
        autoComplete={props.autoComplete ?? "tel-national"}
        autoFocus={props.autoFocus}
        className={styles.control}
        disabled={props.disabled}
        form={props.form}
        id={props.id}
        inputMode="tel"
        onBlur={(event: FocusEvent<HTMLInputElement>) => {
          // Leaving for the chip or the list is not leaving the field.
          if (event.relatedTarget instanceof Node && lane.current?.contains(event.relatedTarget)) return;
          setProblemShown(true);
          onProblem(problemFor(value, country));
          props.onBlur(value);
        }}
        onChange={(event) => onChange(event.currentTarget.value)}
        onFocus={props.onFocus}
        onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
          if (event.key === "Enter" && props.onSubmitted) props.onSubmitted(value);
        }}
        placeholder={props.inputHint}
        readOnly={props.readOnly}
        required={props.required}
        type="tel"
        value={nationalPart(value, dialCode)}
      />
      {/* A form read through FormData gets the whole number under the field's name. */}
      {props.name ? <input form={props.form} name={props.name} type="hidden" value={value} /> : null}
      <CatchAdaptiveSheet
        anchor={lane}
        closeLabel={copy.close}
        onClose={() => {setOpen(false); input.current?.focus();}}
        open={open}
        title={copy.country}
        wide="dropdown"
        width={width}
      >
        <CatchFieldCountryList
          countries={countries}
          noMatchesLabel={copy.noMatches}
          onPicked={pick}
          pinned={props.countryCode}
          searchLabel={copy.search}
          selected={country}
        />
      </CatchAdaptiveSheet>
    </span>
  );
}
