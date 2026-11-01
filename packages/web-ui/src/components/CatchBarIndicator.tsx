import styles from "./CatchBarIndicator.module.css";

/** One period in a bar chart: its label, value, and whether the period is still running. */
export interface CatchBarIndicatorBar {
  label: string;
  value: number;
  /** The period is not over yet: the bar is drawn as an outline. */
  partial?: boolean;
}

/** One bar: a value against a maximum. */
export interface CatchBarIndicatorDefaultProps {
  recipe?: "default";
  value: number;
  maxValue: number;
  /** The bar's accessible name ("Bookings this week"). */
  label: string;
}

/** Simple weekly bars with their values above and labels below. */
export interface CatchBarIndicatorChartProps {
  recipe: "chart";
  bars: readonly CatchBarIndicatorBar[];
  /** The chart's accessible name; each bar's value is read after it. */
  label: string;
  /** The plot height in px; 120 by default. */
  height?: number;
}

export type CatchBarIndicatorProps = CatchBarIndicatorDefaultProps | CatchBarIndicatorChartProps;

/**
 * Flutter's CatchBarIndicator on the web: one quantitative bar, or with the chart recipe a row of
 * bars for simple weekly numbers, the latest period outlined while it is still running. The chart
 * is read aloud as one image with every value.
 */
export function CatchBarIndicator(props: CatchBarIndicatorProps) {
  if (props.recipe !== "chart") {
    const fraction = props.maxValue > 0 ? Math.min(1, Math.max(0, props.value / props.maxValue)) : 0;
    return (
      <span
        aria-label={props.label}
        aria-valuemax={props.maxValue}
        aria-valuemin={0}
        aria-valuenow={props.value}
        className={styles.track}
        role="meter"
      >
        <span className={styles.fill} style={{width: `${fraction * 100}%`}} />
      </span>
    );
  }
  const height = props.height ?? 120;
  const max = Math.max(1, ...props.bars.map((bar) => bar.value));
  const spoken = props.bars.map((bar) => `${bar.label} ${bar.value}${bar.partial ? ", still going" : ""}`).join("; ");
  return (
    <div aria-label={`${props.label}: ${spoken}`} className={styles.chart} role="img">
      <div aria-hidden="true" className={styles.plot} style={{height}}>
        {props.bars.map((bar) => (
          <span className={styles.column} key={bar.label}>
            <span className={styles.value}>{bar.value.toLocaleString("en-IN")}</span>
            <span className={styles.bar} data-partial={bar.partial ? "" : undefined} style={{height: `${(bar.value / max) * (height - 24)}px`}} />
          </span>
        ))}
      </div>
      <div aria-hidden="true" className={styles.labels}>
        {props.bars.map((bar) => <span key={bar.label}>{bar.label}</span>)}
      </div>
    </div>
  );
}
