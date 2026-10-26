import type {ReactNode} from "react";
import {CatchAvatar} from "./CatchAvatar";
import {CatchHeroImage} from "./CatchHeroImage";
import {CatchText} from "./CatchText";
import type {Ground} from "./palette";
import styles from "./CatchProfileHeader.module.css";

/** One figure in the stats line, read as "<value> <label>", such as "2,140 followers". */
export interface CatchProfileHeaderStat {
  label: string;
  value: string;
}

export interface CatchProfileHeaderProps {
  /** Controls under the identity, such as follow and share buttons. */
  actions?: ReactNode;
  /** The cover photo's alternative text. Without one the photo is decorative. */
  coverAlt?: string;
  /** The cover's ground when there is no photo; defaults to coral. */
  coverGround?: Ground;
  coverUrl?: string | null;
  /** A line under the headline, such as the area and handle. */
  meta?: string;
  /** Defaults to the first letters of the name. */
  monogram?: string;
  /** The monogram's ground; defaults to white. */
  monogramGround?: Ground;
  name: string;
  /** The name's element, by document outline; defaults to h1. */
  nameElement?: "h1" | "h2";
  /** The one-line description under the name. */
  headline?: string;
  stats?: readonly CatchProfileHeaderStat[];
  /** A neutral note under the name, such as "Built from public pages · not claimed yet". */
  tag?: string;
  /** Shows the verified seal beside the name, read aloud as this label. */
  verifiedLabel?: string;
}

/**
 * Website v2 profile header: a cover with the monogram over its foot, the
 * name with an optional verified seal, a tag, the headline, a meta line and
 * a stats line, then the caller's actions.
 */
export function CatchProfileHeader({
  actions,
  coverAlt,
  coverGround = "coral",
  coverUrl,
  meta,
  monogram,
  monogramGround = "white",
  name,
  nameElement = "h1",
  headline,
  stats = [],
  tag,
  verifiedLabel,
}: CatchProfileHeaderProps) {
  const photo = Boolean(coverUrl?.trim());
  return (
    <div className={styles.header}>
      <div className={styles.identity}>
        <span className={styles.cover} data-ground={photo ? undefined : coverGround}>
          {photo ? <CatchHeroImage imageUrl={coverUrl} semanticLabel={coverAlt} showScrim={false} /> : null}
        </span>
        <span aria-hidden="true" className={styles.monogram}>
          <CatchAvatar
            borderColor="var(--catch-palette-white)"
            borderWidth={4}
            ground={monogramGround}
            initials={monogram}
            name={name}
            recipe="monogram"
            size={88}
          />
        </span>
      </div>
      <div className={styles.copy}>
        <span className={styles.nameRow}>
          <CatchText as={nameElement} variant="displayM">{name}</CatchText>
          {verifiedLabel ? (
            <svg aria-label={verifiedLabel} className={styles.seal} focusable="false" role="img" viewBox="0 0 24 24">
              <title>{verifiedLabel}</title>
              <path d="M12 2l2.4 2.1 3.2-.3.7 3.1 2.8 1.6-1.3 2.9 1.3 2.9-2.8 1.6-.7 3.1-3.2-.3L12 22l-2.4-2.1-3.2.3-.7-3.1-2.8-1.6 1.3-2.9-1.3-2.9 2.8-1.6.7-3.1 3.2.3z" />
              <path className={styles.check} d="M8.5 12l2.5 2.5 4.5-5" />
            </svg>
          ) : null}
        </span>
        {tag ? <span className={styles.tag}><CatchText as="span" color="inherit" variant="statusLabel">{tag}</CatchText></span> : null}
        {headline ? <CatchText variant="bodyL">{headline}</CatchText> : null}
        {meta ? <CatchText color="ink2" variant="bodyM">{meta}</CatchText> : null}
        {stats.length ? (
          <p className={styles.stats}>
            {stats.map((stat) => (
              <CatchText as="span" key={`${stat.value} ${stat.label}`} variant="bodyM">
                <strong className={styles.value}>{stat.value}</strong>{` ${stat.label}`}
              </CatchText>
            ))}
          </p>
        ) : null}
      </div>
      {actions ? <div className={styles.actions}>{actions}</div> : null}
    </div>
  );
}
