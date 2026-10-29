import type {ReactNode} from "react";
import {CatchText, type CatchTextAccent} from "./CatchText";
import type {Ground} from "./palette";
import styles from "./CatchHeroShowcase.module.css";

export interface CatchHeroShowcaseSticker {
  /** The coloured line, such as "Run club · Fri 6:30 AM". */
  label: string;
  /** The plan's name. */
  title: string;
  ground: Ground;
  /** Colours the label with this accent's deep shade (or the accent on ink). */
  labelAccent?: CatchTextAccent;
}

export interface CatchHeroShowcaseProps {
  /** Usually a tilted CatchDeviceFrame. */
  device: ReactNode;
  /** The panel's ground. */
  ground: Ground;
  /** Up to three plan stickers set around the device on a wide page. */
  stickers?: readonly CatchHeroShowcaseSticker[];
}

/**
 * The homepage hero art: a rounded panel on a ground with the app in a device
 * frame and plan stickers around it. The stickers repeat what the app shows,
 * so they are hidden from assistive technology and leave narrow pages.
 */
export function CatchHeroShowcase({device, ground, stickers = []}: CatchHeroShowcaseProps) {
  return (
    <div className={styles.panel} data-catch-theme={ground === "ink" ? "dark" : "light"} data-ground={ground}>
      <div className={styles.device}>{device}</div>
      {stickers.slice(0, 3).map((sticker, index) => (
        <span
          aria-hidden="true"
          className={styles.sticker}
          data-catch-theme={sticker.ground === "ink" ? "dark" : "light"}
          data-ground={sticker.ground}
          data-slot={index}
          key={`${sticker.label}-${sticker.title}`}
        >
          <CatchText as="span" color={sticker.labelAccent} variant="statusLabel">{sticker.label}</CatchText>
          <CatchText as="span" variant="titleS">{sticker.title}</CatchText>
        </span>
      ))}
    </div>
  );
}
