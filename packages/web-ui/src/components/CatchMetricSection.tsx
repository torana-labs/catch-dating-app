import styles from "./CatchMetricSection.module.css";

/** One caller-formatted number with its label: waiting, booked, revenue. */
export interface CatchMetricData {
  label: string;
  value: string;
  note?: string;
  noteTone?: "secondary" | "success" | "warning" | "danger";
}

export interface CatchMetricSectionProps {
  metrics: readonly CatchMetricData[];
  /** tile: each number on its own tile. inline: a plain strip with no boxes. */
  recipe?: "tile" | "inline";
  /** The strip's accessible name. */
  label?: string;
}

/**
 * Flutter's CatchMetricSection on the web: a strip of caller-formatted numbers that share the
 * width equally and wrap on narrow screens. The quiet register sets numbers in plain type.
 */
export function CatchMetricSection({metrics, recipe = "tile", label}: CatchMetricSectionProps) {
  return (
    <dl aria-label={label} className={styles.strip} data-recipe={recipe}>
      {metrics.map((metric) => (
        <div className={styles.metric} key={metric.label}>
          <dt className={styles.label}>{metric.label}</dt>
          <dd className={styles.value}>{metric.value}</dd>
          {metric.note ? <dd className={styles.note} data-tone={metric.noteTone ?? "secondary"}>{metric.note}</dd> : null}
        </div>
      ))}
    </dl>
  );
}
