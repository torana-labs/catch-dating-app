"use client";

import {useState} from "react";
import {CatchLegacyText} from "./CatchLegacyText";
import type {Format} from "./palette";
import styles from "./CatchFormatTile.module.css";

interface CatchFormatTileBase {
  format: Format;
  /** The line above the name, such as "6 this week" or "Coming to Pune". */
  kicker: string;
  /** The format's name, such as "Run clubs". */
  title: string;
  /** One line about the format. */
  body: string;
  /**
   * A photo of a real plan in this format, held to the tile's foot. Without
   * one, or when it fails to load, the tile is its accent alone.
   */
  photoUrl?: string | null;
}

/** A tile that filters: a toggle button with its pressed state. */
interface CatchFormatTileToggle extends CatchFormatTileBase {
  pressed: boolean;
  onPressed: () => void;
  href?: never;
}

/** A tile that navigates. */
interface CatchFormatTileLink extends CatchFormatTileBase {
  href: string;
  pressed?: never;
  onPressed?: never;
}

export type CatchFormatTileProps = CatchFormatTileToggle | CatchFormatTileLink;

/**
 * A Website v2 format tile: one activity format on its accent, with a count
 * line, the format's name and line, and a plan's photo at the foot.
 */
export function CatchFormatTile(props: CatchFormatTileProps) {
  const {body, format, kicker, title} = props;
  const photoUrl = props.photoUrl?.trim();
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const content = (
    <>
      <CatchLegacyText as="span" color="inherit" variant="supportingStrong">{kicker}</CatchLegacyText>
      <CatchLegacyText as="span" color="inherit" variant="displayS">{title}</CatchLegacyText>
      <CatchLegacyText as="span" color="inherit" variant="bodyM">{body}</CatchLegacyText>
      {photoUrl && failedUrl !== photoUrl ? (
        <img alt="" className={styles.photo} decoding="async" loading="lazy" onError={() => setFailedUrl(photoUrl)} src={photoUrl} />
      ) : null}
    </>
  );
  if (props.href !== undefined) {
    return <a className={styles.tile} data-format={format} href={props.href}>{content}</a>;
  }
  return (
    <button aria-pressed={props.pressed} className={styles.tile} data-format={format} onClick={props.onPressed} type="button">
      {content}
    </button>
  );
}
