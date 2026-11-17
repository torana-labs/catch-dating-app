"use client";

import {useId, type HTMLAttributes, type ReactNode} from "react";
import {catchBandColor, catchBandFootnoteMark, catchBandKickerAccent, type CatchBandFootnote, type CatchBandLink} from "./catchBandParts";
import type {CatchTextTone} from "./catchCoreVocabulary";
import {CatchAvatar} from "./CatchAvatar";
import {useCatchBandKicker, type CatchKickerAccent} from "./CatchBandHeader";
import {CatchButton} from "./CatchButton";
import {CatchMetricTile} from "./CatchMetricTile";
import {CatchStack} from "./CatchStack";
import {CatchSurface} from "./CatchSurface";
import {CatchText} from "./CatchText";
import type {Ground} from "./palette";
import styles from "./CatchStorySection.module.css";

/** Who tells the story: a photo, or initials on a Website v2 ground. */
export interface CatchStorySectionAvatar {
  /** The photo's URL; it falls back to the initials. */
  image?: string;
  /** Defaults to the initials of the title. */
  initials?: string;
  /** The initials' ground; defaults to coral. */
  ground?: Ground;
}

/** A measured result: what it is, the figure, and where the figure comes from. */
export interface CatchStorySectionMetric {
  label: string;
  value: string;
  /** Where the figure comes from, such as the records it was read from. */
  source?: string;
  footnote?: CatchBandFootnote;
}

export interface CatchStorySectionProps extends Omit<HTMLAttributes<HTMLElement>, "children" | "className" | "color" | "style" | "title"> {
  /** Who tells the story, such as an organiser's name: the band's headline. Resolved copy. */
  title: string;
  /** Defaults to 2. */
  level?: 1 | 2;
  kicker?: string;
  kickerTone?: CatchTextTone;
  /** The kicker's accent on white, paper and ink; defaults to the kit's (pink, coral on ink). A colour ground takes its secondary ink. */
  kickerAccent?: CatchKickerAccent;
  /** A line under the name, such as what they run and where. */
  meta?: string;
  avatar?: CatchStorySectionAvatar;
  /** Their words, without quotation marks; the section sets them as a block quote. */
  quote: string;
  /** Measured results, each a metric tile with its source and an optional footnote mark. */
  metrics?: readonly CatchStorySectionMetric[];
  /** The second column, usually a photo CatchScreenPreview. */
  media?: ReactNode;
  /** A link to the full story, drawn as a secondary D20 button. */
  link?: CatchBandLink;
  /** The band's Website v2 ground; text takes its inks, and ink the dark theme. Defaults to the plain band. */
  ground?: Ground;
}

/**
 * One customer story as a band (the playbook kit's story): a kicker, an
 * avatar or initials beside the storyteller's name (the band's headline) and
 * a meta line, their words as a block quote, measured results as metric
 * tiles with their source and footnote marks, and a link to the full story,
 * beside a photo slot. The columns stack below 840px. The band is a section
 * named by its headline.
 */
export function CatchStorySection({title, level = 2, kicker, kickerTone, kickerAccent, meta, avatar, quote, metrics, media, link, ground, ...rest}: CatchStorySectionProps) {
  const titleId = `${useId()}-title`;
  const kickerProps = useCatchBandKicker({accent: catchBandKickerAccent(kickerAccent, ground, "pink"), tone: kickerTone});
  const copy = (
    <CatchStack className={styles.copy} gap={24}>
      {kicker ? <CatchText {...kickerProps}>{kicker}</CatchText> : null}
      <div className={styles.who}>
        {avatar ? (
          avatar.image
            ? <CatchAvatar imageUrl={avatar.image} initials={avatar.initials} name={title} size={56} />
            : <CatchAvatar ground={avatar.ground ?? "coral"} initials={avatar.initials} name={title} recipe="monogram" size={56} />
        ) : null}
        <span className={styles.name}>
          <CatchText as={level === 1 ? "h1" : "h2"} id={titleId} variant="title-bar">{title}</CatchText>
          {meta ? <CatchText as="p" tone="secondary" variant="body-small">{meta}</CatchText> : null}
        </span>
      </div>
      <blockquote className={styles.quote}>
        <CatchText as="p" variant="display-sm">{`“${quote}”`}</CatchText>
      </blockquote>
      {metrics && metrics.length > 0 ? (
        <ul className={styles.metrics}>
          {metrics.map((metric, index) => (
            <li key={`${index}:${metric.label}`}>
              <CatchMetricTile
                label={metric.label}
                note={metric.source || metric.footnote ? <>{metric.source}{catchBandFootnoteMark(metric.footnote)}</> : undefined}
                value={metric.value}
              />
            </li>
          ))}
        </ul>
      ) : null}
      {link ? <span className={styles.link}><CatchButton href={link.href} label={link.label} variant="secondary" /></span> : null}
    </CatchStack>
  );
  return (
    <CatchSurface {...rest} aria-labelledby={titleId} as="section" block="band" color={catchBandColor(ground)}>
      {media != null ? (
        <CatchStack align="center" collapseBelow="expanded" direction="row" equal gap={64}>
          {copy}
          <div className={styles.media}>{media}</div>
        </CatchStack>
      ) : copy}
    </CatchSurface>
  );
}
