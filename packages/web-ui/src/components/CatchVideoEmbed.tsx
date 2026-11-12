"use client";

import {useState} from "react";
import {CatchIcon} from "./CatchIcon";
import {CatchText} from "./CatchText";
import styles from "./CatchVideoEmbed.module.css";

export interface CatchVideoEmbedStill {
  src: string;
  /** What the still shows; the play button names the video itself. */
  alt: string;
}

export interface CatchVideoEmbedProps {
  /** The video's title, under the frame and in the play button's name. */
  title: string;
  /** A line under the title, such as when it was filmed. */
  caption?: string;
  still: CatchVideoEmbedStill;
  /** Where the video lives and whose it is ("YouTube · Lantern Lane Social"), on the frame's foot. */
  source: string;
  /** The running time as the page shows it ("6:12"). */
  duration?: string;
  /**
   * The player's embed address, loaded only once the reader presses play, so
   * nothing is fetched from the video host before then. Prefer the host's
   * privacy-enhanced embed (for YouTube, youtube-nocookie.com).
   */
  embedSrc: string;
  /** The play button's name; defaults to "Play {title}". */
  playLabel?: string;
}

/**
 * Proposal WebEventVideo: one video on an event or organiser page, as a still
 * with a play button, its source and running time. Pressing play swaps the
 * still for the player in place, at 16:9; the page never navigates away.
 */
export function CatchVideoEmbed({title, caption, still, source, duration, embedSrc, playLabel}: CatchVideoEmbedProps) {
  const [playing, setPlaying] = useState(false);
  return (
    <figure className={styles.video}>
      <div className={styles.frame} data-playing={playing ? "" : undefined}>
        {playing ? (
          <iframe
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            className={styles.player}
            referrerPolicy="strict-origin-when-cross-origin"
            src={embedSrc}
            title={title}
          />
        ) : (
          <>
            <img alt={still.alt} className={styles.image} decoding="async" loading="lazy" src={still.src} />
            <span className={styles.foot}>
              <span>{source}</span>
              {duration ? <span className={styles.duration}>{duration}</span> : null}
            </span>
            {/* The whole still plays; only the disc is drawn inside the button, so its name is all it says. */}
            <button aria-label={playLabel ?? `Play ${title}`} className={styles.still} onClick={() => setPlaying(true)} type="button">
              <span aria-hidden="true" className={styles.play}><CatchIcon name="play" size={24} /></span>
            </button>
          </>
        )}
      </div>
      <figcaption className={styles.caption}>
        <CatchText as="span" variant="label-action">{title}</CatchText>
        {caption ? <CatchText as="span" tone="secondary" variant="body-meta">{caption}</CatchText> : null}
      </figcaption>
    </figure>
  );
}
