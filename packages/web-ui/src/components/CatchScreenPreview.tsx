"use client";

import type {CSSProperties, HTMLAttributes} from "react";
import {CatchBadge, type CatchBadgeTone} from "./CatchBadge";
import {CatchButton} from "./CatchButton";
import {CatchDeviceFrame, type CatchDeviceFrameTilt} from "./CatchDeviceFrame";
import {CatchGroundProvider} from "./CatchGroundProvider";
import {CatchQrCode} from "./CatchQrCode";
import {CatchText} from "./CatchText";
import type {Ground, PaletteAccent} from "./palette";
import styles from "./CatchScreenPreview.module.css";

/**
 * card: a floating screen card. phonecard: the card on a phone screen. phone
 * and tablet: an image in the device frame. photo: an image with a tag.
 * tiles: a two-column grid of ground tiles.
 */
export type CatchScreenPreviewKind = "card" | "phonecard" | "phone" | "tablet" | "photo" | "tiles";

/** A slight turn, as the boards set screens at an angle. */
export type CatchScreenPreviewTilt = CatchDeviceFrameTilt;

/** A figure and what it counts, such as 31 over "checked in". */
export interface CatchScreenPreviewStat {
  value: string;
  label: string;
}

/** A labelled bar: its share of the track (0 to 100) and the figure at its end. */
export interface CatchScreenPreviewBar {
  label: string;
  value: string;
  share: number;
  /** The bar's palette accent; defaults to ink. */
  accent?: PaletteAccent;
}

/** A list row: a title and an optional second line, then a tag or a figure. */
export interface CatchScreenPreviewRow {
  title: string;
  subtitle?: string;
  /** A status tag at the end of the row, drawn as a small badge. */
  tag?: string;
  /** The tag's tone; defaults to neutral. */
  tone?: CatchBadgeTone;
  /** A figure at the end of the row, after any tag. */
  value?: string;
}

/** A question and its options, the selected ones filled. Drawn, never a control. */
export interface CatchScreenPreviewChoice {
  label: string;
  options: readonly string[];
  /** The selected option's position, or several positions. */
  selected?: number | readonly number[];
}

/** A row with a stepper drawn at its end. */
export interface CatchScreenPreviewCounter {
  title: string;
  subtitle?: string;
  value: string;
}

/** A labelled field drawn as a box: its value, or its placeholder in the secondary ink. */
export interface CatchScreenPreviewField {
  label: string;
  placeholder?: string;
  value?: string;
}

/** A button drawn without a control (a non-interactive CatchButton). */
export interface CatchScreenPreviewButton {
  label: string;
  /** Defaults to primary for the first button and secondary after it. */
  variant?: "primary" | "secondary";
}

/** One tile of the tiles kind. */
export interface CatchScreenPreviewTile {
  title: string;
  body?: string;
  /** Defaults to paper. */
  ground?: Ground;
}

export interface CatchScreenPreviewProps extends Omit<HTMLAttributes<HTMLElement>, "children" | "className" | "color" | "style" | "title"> {
  /**
   * What the screen shows, read aloud in place of its parts: the whole
   * preview is one image. Resolved copy.
   */
  semanticsLabel: string;
  /** Defaults to card. */
  kind?: CatchScreenPreviewKind;
  /** A visible line under the screen, such as "Illustrative screen". */
  caption?: string;
  /** phone, tablet and photo: the image's URL. It is decorative; semanticsLabel names it. */
  image?: string;
  /** photo: a short tag over the image's corner. */
  tag?: string;
  /** card: a cover image across the card's top. Decorative. */
  cover?: string;
  /** card: a small pill above the title. */
  label?: string;
  title?: string;
  subtitle?: string;
  /** card: a search box holding this text. */
  search?: string;
  stats?: readonly CatchScreenPreviewStat[];
  bars?: readonly CatchScreenPreviewBar[];
  rows?: readonly CatchScreenPreviewRow[];
  /** card: a QR code of this text, with the text under it. */
  qr?: string;
  choices?: readonly CatchScreenPreviewChoice[];
  counters?: readonly CatchScreenPreviewCounter[];
  fields?: readonly CatchScreenPreviewField[];
  buttons?: readonly CatchScreenPreviewButton[];
  /** card: a dark note at the card's foot. */
  chip?: string;
  /** card: fine print at the very foot. */
  fine?: string;
  /** tiles: the tiles. */
  tiles?: readonly CatchScreenPreviewTile[];
  /** card: the card's fill; defaults to white. */
  tone?: Ground;
  /** card, phonecard, phone and tablet. Defaults to none. */
  tilt?: CatchScreenPreviewTilt;
  /** card: a flat card that fills its column, with an outline in place of the shadow. */
  flat?: boolean;
}

const isSelected = (selected: CatchScreenPreviewChoice["selected"], index: number) =>
  Array.isArray(selected) ? selected.includes(index) : selected === index;

function CardBody(props: CatchScreenPreviewProps) {
  const {cover, label, title, subtitle, search, stats, bars, rows, qr, choices, counters, fields, buttons, chip, fine} = props;
  return (
    <>
      {cover ? <img alt="" className={styles.cover} src={cover} /> : null}
      {label ? <span className={styles.pill}><CatchText variant="label-badge">{label}</CatchText></span> : null}
      {title ? <CatchText className={styles.title} variant="title-row">{title}</CatchText> : null}
      {subtitle ? <CatchText tone="secondary" variant="body-small">{subtitle}</CatchText> : null}
      {stats && stats.length > 0 ? (
        <span className={styles.stats}>
          {stats.map((stat, index) => (
            <span className={styles.stat} key={`${index}:${stat.label}`}>
              <CatchText numeric variant="display-sm">{stat.value}</CatchText>
              <CatchText tone="secondary" variant="body-meta">{stat.label}</CatchText>
            </span>
          ))}
        </span>
      ) : null}
      {search ? <span className={styles.search}><CatchText tone="secondary" variant="body-small">{search}</CatchText></span> : null}
      {bars && bars.length > 0 ? (
        <span className={styles.bars}>
          {bars.map((bar, index) => (
            <span className={styles.bar} key={`${index}:${bar.label}`}>
              <CatchText variant="body-meta">{bar.label}</CatchText>
              <span className={styles.track}>
                <span
                  className={styles.fill}
                  data-accent={bar.accent}
                  style={{"--catch-preview-share": `${Math.min(100, Math.max(0, bar.share))}%`} as CSSProperties}
                />
              </span>
              <CatchText numeric variant="label-action">{bar.value}</CatchText>
            </span>
          ))}
        </span>
      ) : null}
      {rows && rows.length > 0 ? (
        <span className={styles.rows}>
          {rows.map((row, index) => (
            <span className={styles.row} key={`${index}:${row.title}`}>
              <span className={styles.rowCopy}>
                <CatchText variant="label-action">{row.title}</CatchText>
                {row.subtitle ? <CatchText tone="secondary" variant="body-meta">{row.subtitle}</CatchText> : null}
              </span>
              {row.tag ? <CatchBadge label={row.tag} size="sm" tone={row.tone ?? "neutral"} /> : null}
              {row.value ? <CatchText numeric variant="display-sm">{row.value}</CatchText> : null}
            </span>
          ))}
        </span>
      ) : null}
      {qr ? (
        <span className={styles.qr}>
          <CatchQrCode label={qr} size="l" value={qr} />
          <CatchText variant="label-code">{qr}</CatchText>
        </span>
      ) : null}
      {choices?.map((choice, index) => (
        <span className={styles.choice} key={`${index}:${choice.label}`}>
          <CatchText tone="secondary" variant="body-meta">{choice.label}</CatchText>
          <span className={styles.options}>
            {choice.options.map((option, position) => (
              <span className={styles.option} data-selected={isSelected(choice.selected, position) ? "" : undefined} key={`${position}:${option}`}>
                <CatchText variant="label-action">{option}</CatchText>
              </span>
            ))}
          </span>
        </span>
      ))}
      {counters?.map((counter, index) => (
        <span className={styles.counter} key={`${index}:${counter.title}`}>
          <span className={styles.rowCopy}>
            <CatchText variant="label-action">{counter.title}</CatchText>
            {counter.subtitle ? <CatchText tone="secondary" variant="body-meta">{counter.subtitle}</CatchText> : null}
          </span>
          <span className={styles.stepper}>
            <span className={styles.step}>−</span>
            <CatchText numeric variant="display-sm">{counter.value}</CatchText>
            <span className={styles.step}>+</span>
          </span>
        </span>
      ))}
      {fields && fields.length > 0 ? (
        <span className={styles.fields}>
          {fields.map((field, index) => (
            <span className={styles.field} key={`${index}:${field.label}`}>
              <CatchText variant="body-meta">{field.label}</CatchText>
              <span className={styles.box}>
                <CatchText tone={field.value ? "inherit" : "secondary"} variant="body-small">{field.value ?? field.placeholder ?? ""}</CatchText>
              </span>
            </span>
          ))}
        </span>
      ) : null}
      {buttons && buttons.length > 0 ? (
        <span className={styles.buttons}>
          {buttons.map((button, index) => (
            <CatchButton
              isInteractive={false}
              key={`${index}:${button.label}`}
              label={button.label}
              size="sm"
              variant={button.variant ?? (index === 0 ? "primary" : "secondary")}
            />
          ))}
        </span>
      ) : null}
      {chip ? <span className={styles.chip}><CatchText variant="body-meta">{chip}</CatchText></span> : null}
      {fine ? <CatchText className={styles.fine} tone="secondary" variant="body-meta">{fine}</CatchText> : null}
    </>
  );
}

function Visual(props: CatchScreenPreviewProps) {
  const {kind = "card", image, tag, tiles, tone, tilt = "none", flat} = props;
  if (kind === "phone" || kind === "tablet") {
    return (
      <div className={styles.device} data-kind={kind}>
        <CatchDeviceFrame kind={kind} tilt={tilt}>
          {image ? <img alt="" src={image} /> : <span className={styles.blank} />}
        </CatchDeviceFrame>
      </div>
    );
  }
  if (kind === "photo") {
    return (
      <div className={styles.photo}>
        {image ? <img alt="" src={image} /> : null}
        {tag ? <span className={styles.tag}><CatchText variant="label-badge">{tag}</CatchText></span> : null}
      </div>
    );
  }
  if (kind === "tiles") {
    return (
      <div className={styles.tiles}>
        {(tiles ?? []).map((tile, index) => (
          <span className={styles.tile} data-ground={tile.ground ?? "paper"} key={`${index}:${tile.title}`}>
            <CatchText variant="title-row">{tile.title}</CatchText>
            {tile.body ? <CatchText tone="secondary" variant="body-small">{tile.body}</CatchText> : null}
          </span>
        ))}
      </div>
    );
  }
  if (kind === "phonecard") {
    return (
      <div className={styles.device} data-kind="phone">
        <CatchDeviceFrame kind="phone" tilt={tilt}>
          <div className={styles.screen}>
            <CardBody {...props} />
          </div>
        </CatchDeviceFrame>
      </div>
    );
  }
  return (
    <div className={styles.card} data-flat={flat ? "" : undefined} data-ground={tone ?? "white"} data-tilt={tilt}>
      <CardBody {...props} />
    </div>
  );
}

/**
 * An illustrative app screen for a website section (the playbook kit's mock):
 * a screen card, the card on a phone, an image in a device frame, a photo
 * with a tag, or a grid of tiles. It is a picture, not an interface: the
 * whole preview is one image named by semanticsLabel, nothing in it takes
 * focus, and its buttons, choices, steppers and fields are drawn, never
 * controls. The screen keeps the day theme on any band.
 */
export function CatchScreenPreview({
  semanticsLabel,
  kind = "card",
  caption,
  image,
  tag,
  cover,
  label,
  title,
  subtitle,
  search,
  stats,
  bars,
  rows,
  qr,
  choices,
  counters,
  fields,
  buttons,
  chip,
  fine,
  tiles,
  tone,
  tilt,
  flat,
  ...rest
}: CatchScreenPreviewProps) {
  const visual = {
    semanticsLabel, kind, image, tag, cover, label, title, subtitle, search, stats, bars, rows, qr,
    choices, counters, fields, buttons, chip, fine, tiles, tone, tilt, flat,
  };
  return (
    <figure {...rest} className={styles.preview} data-kind={kind}>
      <div aria-label={semanticsLabel} className={styles.visual} data-catch-theme="light" role="img">
        {/* The screen is a day screen wherever it sits, so the parts it draws read the plain ground. */}
        <CatchGroundProvider ground="ground" theme="day">
          <Visual {...visual} />
        </CatchGroundProvider>
      </div>
      {caption ? (
        <figcaption className={styles.caption}>
          <CatchText tone="secondary" variant="body-meta">{caption}</CatchText>
        </figcaption>
      ) : null}
    </figure>
  );
}
