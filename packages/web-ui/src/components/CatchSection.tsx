import {Children, type CSSProperties, type ReactNode} from "react";
import styles from "./CatchSection.module.css";

export interface CatchSectionAction {
  label: string;
  href?: string;
  onPressed?: () => void;
}

/** One step of a journey: what happened, when, and whether it is done, now or still to come. */
export interface CatchSectionStep {
  title: string;
  subtitle?: string;
  /** When it happened ("Mon 28 Oct, 9:41 PM", "Now", "Next"). */
  meta?: string;
  state: "done" | "current" | "next";
  /** current only: the tone of the step that waits ("Waiting for a review"). */
  tone?: "neutral" | "warning" | "danger";
}

export interface CatchSectionProps {
  title?: string;
  /** A muted line above the title. */
  kicker?: string;
  /** Shown after the title, muted: how many rows the section holds. */
  count?: number;
  /** A quiet action on the right of the title ("All 14"). */
  action?: CatchSectionAction;
  /** A short muted note on the right instead of an action ("3 of 4"). */
  note?: string;
  /** between: a line between rows. all: also under the last row. none. */
  dividers?: "between" | "all" | "none";
  /** plain rows on the page, or rows inside a tile (a settings group). */
  container?: "plain" | "tile";
  /**
   * A journey drawn as joined markers: a filled ink marker for each done step, a dot for the step
   * that waits now and a ring for what comes next. The line is ink below a done step.
   */
  timeline?: readonly CatchSectionStep[];
  /** Shown instead of children when there are none. */
  empty?: ReactNode;
  footer?: ReactNode;
  /** One list flowing down into 2 or 3 columns; columns separate the rows, so they draw no lines. */
  columns?: 2 | 3;
  children?: ReactNode;
}

/**
 * Flutter's CatchSection on the web: a titled group of rows that owns the lines between them. A
 * list you pick from (one row selected, rule 12) drops its lines; a timeline joins the rows'
 * markers; a long list can flow into columns, which fold back to one on phones.
 */
export function CatchSection({
  title,
  kicker,
  count,
  action,
  note,
  dividers = "between",
  container = "plain",
  timeline,
  empty,
  footer,
  columns,
  children,
}: CatchSectionProps) {
  const rows = timeline ? timeline.map((step, index) => (
    <div className={styles.step} data-state={step.state} data-tone={step.tone} key={`${index}-${step.title}`} role="listitem">
      <span aria-hidden="true" className={styles.marker} />
      <span className={styles.stepText}>
        <span className={styles.stepTitle}>
          <span className={styles.hidden}>{step.state === "done" ? "Done: " : step.state === "current" ? "Now: " : "Next: "}</span>
          {step.title}
        </span>
        {step.subtitle ? <span className={styles.stepSubtitle}>{step.subtitle}</span> : null}
      </span>
      {step.meta ? <span className={styles.stepMeta}>{step.meta}</span> : null}
    </div>
  )) : Children.toArray(children);
  const perColumn = columns ? Math.ceil(rows.length / columns) : undefined;
  const actionNode = action ? (
    action.href
      ? <a className={styles.action} href={action.href} onClick={action.onPressed}>{action.label}</a>
      : <button className={styles.action} onClick={action.onPressed} type="button">{action.label}</button>
  ) : note ? <span className={styles.note}>{note}</span> : null;
  return (
    <section className={styles.section} data-container={container}>
      {title ? (
        <div className={styles.header}>
          <span className={styles.titles}>
            {kicker ? <span className={styles.kicker}>{kicker}</span> : null}
            <h2 className={styles.title}>
              {title}
              {count != null ? <span className={styles.count}> {count}</span> : null}
            </h2>
          </span>
          {actionNode}
        </div>
      ) : null}
      <div
        className={styles.list}
        data-columns={columns}
        data-dividers={columns ? "none" : dividers}
        data-timeline={timeline ? "" : undefined}
        role={timeline ? "list" : undefined}
        style={perColumn ? ({"--catch-section-rows": perColumn} as CSSProperties) : undefined}
      >
        {rows.length > 0 ? rows : empty}
      </div>
      {footer}
    </section>
  );
}
