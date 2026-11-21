"use client";

import {useId, type CSSProperties, type HTMLAttributes, type ReactNode} from "react";
import {catchBandActions, catchBandColor, catchBandFootnoteMark, catchBandKickerAccent, type CatchBandAction, type CatchBandFootnote, type CatchBandLink} from "./catchBandParts";
import type {CatchTextTone} from "./catchCoreVocabulary";
import {CatchBandHeader, type CatchKickerAccent} from "./CatchBandHeader";
import {CatchChip} from "./CatchChip";
import {CatchDateTile, type CatchDateTileProps} from "./CatchDateTile";
import {CatchGroundProvider} from "./CatchGroundProvider";
import {CatchHeroImage} from "./CatchHeroImage";
import {CatchIcon} from "./CatchIcon";
import {CatchStack} from "./CatchStack";
import {CatchSurface} from "./CatchSurface";
import {CatchText} from "./CatchText";
import type {Ground} from "./palette";
import styles from "./CatchHeroSection.module.css";

/** split: copy beside the media on a ground band. photo: the copy over a full-bleed photo. */
export type CatchHeroSectionLayout = "split" | "photo";

/** One proof line, such as a rating, with an optional footnote mark. */
export interface CatchHeroSectionProofItem {
  text: string;
  footnote?: CatchBandFootnote;
}

/**
 * The homepage's plan chip floating over the media (the kit's .hchip): a
 * date square beside the title and one line under it.
 */
export interface CatchHeroSectionAside {
  title: string;
  /** The plan chip's date square; the month is read, not shown. */
  date?: Omit<CatchDateTileProps, "size">;
  /** One line under the title, such as "Lantern Lane Tavern · 6 left". */
  meta?: string;
}

/**
 * A cut-out of one widget from the media's own screen: a capture of the real
 * app, cropped to that widget, so its names and numbers agree with the
 * screen. Never a drawn card.
 */
export interface CatchHeroSectionFragment {
  /** The cut-out's image URL. */
  src: string;
  /** Its size in pixels. */
  width: number;
  /** The width in pixels of the screen it was cut from: the cut-out is drawn at that screen's scale. */
  screenWidth: number;
  height: number;
}

/**
 * A white card under the actions (the homepage's .notify): a title, one line
 * and the page's own form, such as a WhatsApp notify field. The page owns the
 * form's state and submit.
 */
export interface CatchHeroSectionNotice {
  title: string;
  body?: string;
  children: ReactNode;
  /** A picture before the words, such as the host landing's QR code (PlaybookHosts .qr): it sits beside them. */
  leading?: ReactNode;
}

export interface CatchHeroSectionProps extends Omit<HTMLAttributes<HTMLElement>, "children" | "className" | "color" | "style" | "title"> {
  /** The headline. Resolved copy; the caller localizes it. */
  title: string;
  /** Defaults to 1: a hero opens its page. */
  level?: 1 | 2;
  kicker?: string;
  /** The kicker's colour as a tone; it wins over kickerAccent. */
  kickerTone?: CatchTextTone;
  /** The kicker's accent on white, paper and ink; defaults to pink (coral on ink). A colour ground, the usual hero, takes its secondary ink. */
  kickerAccent?: CatchKickerAccent;
  lead?: string;
  /** Short labels under the lead, drawn as tag chips. */
  labels?: readonly string[];
  /** Proof lines, such as counts and ratings, each with an optional footnote mark. */
  proof?: readonly CatchHeroSectionProofItem[];
  /** D20 buttons: the first primary and the rest secondary unless named. */
  actions?: readonly CatchBandAction[];
  /** A small line under the actions. */
  note?: string;
  /** split: a white card under the actions, such as a WhatsApp notify form. */
  notice?: CatchHeroSectionNotice;
  /** A side link under everything: an underlined link with an arrow, at the start edge. */
  link?: CatchBandLink;
  /** A sentence before the side link that says who it is for, such as "Running a venue?". */
  linkLead?: string;
  /** split: the media column, usually a CatchScreenPreview. It sits on the band's bottom edge. */
  media?: ReactNode;
  /** split: the plan chip floating over the media. */
  aside?: CatchHeroSectionAside;
  /**
   * split: up to three cut-outs of the media's own screen, floating on the
   * phone's edges on an expanded page and tucked at its sides below it,
   * where only the first two show. A hero never captions its media.
   */
  fragments?: readonly CatchHeroSectionFragment[];
  /** split: the band's Website v2 ground; text takes its inks, and ink the dark theme. Defaults to the plain band. */
  ground?: Ground;
  /** Defaults to split. */
  layout?: CatchHeroSectionLayout;
  /** photo: the photo's URL. Without one the branded no-photo fill shows. */
  image?: string;
  /** photo: the photo's alternative text; without it the photo is decorative. */
  imageAlt?: string;
}

/**
 * The opening band of a website page (the playbook kit's hero and photo
 * hero): a kicker, the page headline, a lead, label chips, proof lines with
 * footnote marks, D20 actions, a white notice card (such as a notify form), a
 * note and a side link, beside a media slot with the plan chip (a date
 * square beside the title) or up to three cut-outs of the media's own screen
 * floating over it, on a Website v2 ground. Below the expanded width the
 * media always sits under the copy and actions, never over them. The photo layout
 * sets the same copy in the dark theme over a full-bleed photo under the
 * detail-hero scrim. The headline takes the canvas's hero size (80px, 44px on
 * phones). On a ground the band is an inset panel straight under the header.
 * The band is a section named by its headline.
 */
export function CatchHeroSection({
  title,
  level = 1,
  kicker,
  kickerTone,
  kickerAccent,
  lead,
  labels,
  proof,
  actions,
  note,
  notice,
  link,
  linkLead,
  media,
  aside,
  fragments,
  ground,
  layout = "split",
  image,
  imageAlt,
  id,
  ...rest
}: CatchHeroSectionProps) {
  const titleId = `${useId()}-title`;
  const chips = labels?.filter((label) => label.trim() !== "") ?? [];
  const copy = (
    <CatchStack className={styles.copy} gap={24}>
      <CatchBandHeader kicker={kicker} kickerAccent={catchBandKickerAccent(kickerAccent, layout === "photo" ? "ink" : ground, "pink")} kickerTone={kickerTone} lead={lead} level={level} size="hero" title={title} titleId={titleId} />
      {chips.length > 0 ? (
        <CatchStack as="ul" className={styles.list} direction="row" gap={8} wrap>
          {chips.map((label, index) => <li key={`${index}:${label}`}><CatchChip label={label} recipe="tag" /></li>)}
        </CatchStack>
      ) : null}
      {proof && proof.length > 0 ? (
        <CatchStack as="ul" className={styles.list} direction="row" gap={12} wrap>
          {proof.map((item, index) => (
            <li className={styles.proof} key={`${index}:${item.text}`}>
              <CatchText variant="label-action">{item.text}{catchBandFootnoteMark(item.footnote)}</CatchText>
            </li>
          ))}
        </CatchStack>
      ) : null}
      {catchBandActions(actions)}
      {notice ? (
        <div className={styles.notice} data-catch-theme="light" data-leading={notice.leading != null ? "" : undefined}>
          <CatchGroundProvider ground="ground" theme="day">
            {notice.leading != null ? <div className={styles.noticeLeading}>{notice.leading}</div> : null}
            <div className={styles.noticeCopy}>
              <CatchText as="h2" variant="label-button">{notice.title}</CatchText>
              {notice.body ? <CatchText as="p" className={styles.noticeBody} tone="secondary" variant="body-meta">{notice.body}</CatchText> : null}
              {notice.children}
            </div>
          </CatchGroundProvider>
        </div>
      ) : null}
      {note ? <CatchText as="p" tone="secondary" variant="body-meta">{note}</CatchText> : null}
      {link ? (
        <CatchText as="p" className={styles.link} tone="secondary" variant="body-meta">
          {linkLead ? <>{linkLead} </> : null}
          <a className={styles.linkAction} href={link.href}>{link.label}<span aria-hidden="true" className={styles.linkArrow}><CatchIcon name="forward" size={16} /></span></a>
        </CatchText>
      ) : null}
    </CatchStack>
  );

  if (layout === "photo") {
    return (
      <CatchSurface {...rest} aria-labelledby={titleId} as="section" block="band" data-layout="photo" id={id}>
        <div className={styles.photo}>
          <span className={styles.image}><CatchHeroImage imageUrl={image} semanticLabel={imageAlt} /></span>
          <div className={styles.over} data-catch-theme="dark">
            <CatchGroundProvider ground="night" theme="night">{copy}</CatchGroundProvider>
          </div>
        </div>
      </CatchSurface>
    );
  }

  const cutouts = (fragments ?? []).slice(0, 3);
  const hasMedia = media != null || aside != null;
  const floating = aside != null || (media != null && cutouts.length > 0);
  return (
    <CatchSurface
      {...rest}
      aria-labelledby={titleId}
      as="section"
      block="band"
      color={catchBandColor(ground)}
      data-layout="split"
      id={id}
      padding={hasMedia ? "none" : undefined}
    >
      {hasMedia ? (
        <CatchStack align="end" className={styles.split} collapseBelow="expanded" direction="row" equal gap={64}>
          <div className={styles.text}>{copy}</div>
          <div className={styles.media} data-floating={floating ? "" : undefined}>
            {media != null && cutouts.length > 0 ? (
              <div className={styles.stage}>
                {media}
                <ul aria-hidden="true" className={styles.fragments}>
                  {cutouts.map((fragment) => (
                    <li className={styles.fragment} key={fragment.src}
                      style={{"--catch-hero-fragment-share": fragment.width / fragment.screenWidth} as CSSProperties}>
                      <img alt="" className={styles.fragmentImage} decoding="async" height={fragment.height} src={fragment.src} width={fragment.width} />
                    </li>
                  ))}
                </ul>
              </div>
            ) : media}
            {aside ? (
              <CatchSurface block="floating" className={styles.aside} padding="none">
                {aside.date ? <CatchDateTile {...aside.date} size="sm" /> : null}
                <div className={styles.asideCopy}>
                  <CatchText as="p" variant="label-button">{aside.title}</CatchText>
                  {aside.meta ? <CatchText as="p" tone="secondary" variant="body-meta">{aside.meta}</CatchText> : null}
                </div>
              </CatchSurface>
            ) : null}
          </div>
        </CatchStack>
      ) : copy}
    </CatchSurface>
  );
}
