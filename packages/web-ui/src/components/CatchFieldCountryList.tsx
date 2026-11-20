"use client";

import {type KeyboardEvent, useEffect, useId, useMemo, useRef, useState} from "react";
import type {CatchPhoneCountry, CatchPhoneCountryCode} from "../phone";
import {CatchIcon} from "./CatchIcon";
import styles from "./CatchFieldCountryList.module.css";

export interface CatchFieldCountryListProps {
  countries: readonly CatchPhoneCountry[];
  /** The country the field is in: ticked, and active when the list opens. */
  selected: CatchPhoneCountryCode;
  /** The site's own country, pinned at the top. */
  pinned: CatchPhoneCountryCode;
  onPicked: (countryCode: CatchPhoneCountryCode) => void;
  /** Names the search box and the list. */
  searchLabel: string;
  noMatchesLabel: string;
}

const folded = (text: string) => text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

/** The countries a query keeps: by name, by code ("IN") or by dialling code ("+91", "91"). */
function matching(countries: readonly CatchPhoneCountry[], query: string): CatchPhoneCountry[] {
  const typed = folded(query.trim());
  if (!typed) return [...countries];
  const digits = typed.replace(/\D/gu, "");
  return countries.filter((country) =>
    folded(country.name).split(/[\s,()-]+/u).some((word) => word.startsWith(typed)) ||
    folded(country.name).startsWith(typed) ||
    country.countryCode.toLowerCase() === typed ||
    (digits !== "" && country.dialCode.slice(1).startsWith(digits)));
}

/**
 * The phone field's country list (issue #2144): a search line, then plain rows
 * of country name and dialling code, the selected one ticked and the site's own
 * country first. Typing filters, the arrow keys move, Enter picks; the sheet or
 * dropdown it sits in closes on Escape.
 */
export function CatchFieldCountryList({countries, selected, pinned, onPicked, searchLabel, noMatchesLabel}: CatchFieldCountryListProps) {
  const listId = useId();
  const [query, setQuery] = useState("");
  const ordered = useMemo(() => {
    const first = countries.find((country) => country.countryCode === pinned);
    return first ? [first, ...countries.filter((country) => country !== first)] : [...countries];
  }, [countries, pinned]);
  const shown = useMemo(() => matching(ordered, query), [ordered, query]);
  const [active, setActive] = useState(() => Math.max(0, ordered.findIndex((country) => country.countryCode === selected)));
  const rows = useRef(new Map<number, HTMLLIElement>());
  const current = Math.min(active, Math.max(0, shown.length - 1));

  useEffect(() => {
    rows.current.get(current)?.scrollIntoView?.({block: "nearest"});
  }, [current]);

  const move = (to: number) => setActive(Math.max(0, Math.min(shown.length - 1, to)));
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    const step = {ArrowDown: 1, ArrowUp: -1}[event.key];
    if (step !== undefined) {
      event.preventDefault();
      move(current + step);
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      move(event.key === "Home" ? 0 : shown.length - 1);
    } else if (event.key === "Enter") {
      event.preventDefault();
      const picked = shown[current];
      if (picked) onPicked(picked.countryCode);
    }
  };
  const optionId = (index: number) => `${listId}-${index}`;

  return (
    <div className={styles.list}>
      <input
        aria-activedescendant={shown.length > 0 ? optionId(current) : undefined}
        aria-autocomplete="list"
        aria-controls={listId}
        aria-expanded="true"
        aria-label={searchLabel}
        autoComplete="off"
        className={styles.search}
        onChange={(event) => {setQuery(event.currentTarget.value); setActive(0);}}
        onKeyDown={onKeyDown}
        placeholder={searchLabel}
        role="combobox"
        type="search"
        value={query}
      />
      {shown.length === 0 ? <p className={styles.empty}>{noMatchesLabel}</p> : null}
      <ul aria-label={searchLabel} className={styles.options} id={listId} role="listbox">
        {shown.map((country, index) => (
          <li
            aria-selected={country.countryCode === selected}
            className={styles.option}
            data-active={index === current || undefined}
            id={optionId(index)}
            key={country.countryCode}
            onClick={() => onPicked(country.countryCode)}
            // Keep focus in the search box, so the keys go on working after a hover.
            onMouseDown={(event) => event.preventDefault()}
            onMouseMove={() => {if (index !== current) setActive(index);}}
            ref={(row) => {if (row) rows.current.set(index, row); else rows.current.delete(index);}}
            role="option"
          >
            <span className={styles.name}>{country.name}</span>
            <span className={styles.dial}>{country.dialCode}</span>
            <span aria-hidden="true" className={styles.tick}>
              {country.countryCode === selected ? <CatchIcon name="check" size={16} /> : null}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
