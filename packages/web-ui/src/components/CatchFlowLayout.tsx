"use client";

import {useId, type HTMLAttributes, type ReactNode} from "react";
import type {CatchTextTone} from "./catchCoreVocabulary";
import {CatchBandHeader} from "./CatchBandHeader";
import {CatchSurface} from "./CatchSurface";
import styles from "./CatchFlowLayout.module.css";

export interface CatchFlowLayoutProps extends Omit<HTMLAttributes<HTMLElement>, "className" | "color" | "style" | "title"> {
  /** The step's headline. Resolved copy; the caller localizes it. */
  title: string;
  /** Defaults to 1: a flow step is its page's main heading. */
  level?: 1 | 2;
  kicker?: string;
  kickerTone?: CatchTextTone;
  lead?: string;
  /** Above the head: the flow's progress (a row CatchFormStepList) or its tabs (a CatchPageTabBar). */
  navigation?: ReactNode;
  /** A notice above everything, such as a CatchBanner. */
  banner?: ReactNode;
  /** The content column: the step's cards, fields and actions, 14px apart. */
  children?: ReactNode;
  /** Fine print under the content. */
  footer?: ReactNode;
  /** A 1040px frame whose content sits two across on a wide page, instead of the 640px column. */
  wide?: boolean;
}

/**
 * The frame of a website flow step (the playbook kit's flow), such as a
 * booking, a checkout or an application: an optional banner, the step list
 * or tabs, a head (kicker, headline, lead) and the content column, centred
 * at 640px, or 1040px with two columns when wide. It draws on the plain band
 * and is a section named by its headline; the page owns the step's state.
 */
export function CatchFlowLayout({title, level = 1, kicker, kickerTone, lead, navigation, banner, children, footer, wide = false, ...rest}: CatchFlowLayoutProps) {
  const titleId = `${useId()}-title`;
  return (
    <CatchSurface {...rest} aria-labelledby={titleId} as="section" block="band" data-wide={wide ? "" : undefined}>
      <div className={styles.frame} data-wide={wide ? "" : undefined}>
        {banner != null ? <div className={styles.banner}>{banner}</div> : null}
        {navigation != null ? <div className={styles.navigation}>{navigation}</div> : null}
        <CatchBandHeader kicker={kicker} kickerTone={kickerTone} lead={lead} level={level} title={title} titleId={titleId} />
        {children != null ? <div className={styles.content}>{children}</div> : null}
        {footer != null ? <div className={styles.footer}>{footer}</div> : null}
      </div>
    </CatchSurface>
  );
}
