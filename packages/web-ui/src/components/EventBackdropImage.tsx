import {useId, type CSSProperties, type ReactNode} from "react";
import {
  activityArtworkGradientAxis,
  activityArtworkMarks,
  activityArtworkPatterns,
  activityArtworkStops,
  activityArtworkStrokeWidth,
  activityArtworkTokenNames,
  type ActivityArtworkMark,
  type CatchActivityKind,
} from "./activityArtwork";
import styles from "./EventBackdropImage.module.css";
import {useMeasuredBox} from "./useMeasuredBox";

export interface EventBackdropImageProps {
  activityKind: CatchActivityKind;
  /** The app's dense ground (accent, deep, accent), for small or busy media. */
  dense?: boolean;
  /** Runs the ground from the top-right, so the deep end sits under bottom-left type. */
  mirrored?: boolean;
  /** An activity glyph, drawn large and faint at the bottom right as in the app. */
  glyph?: ReactNode;
}

// The size drawn before the first measurement, e.g. during server rendering.
const initialBox = {width: 360, height: 240};

/**
 * Activity artwork for media without a photo (G6): the activity's duotone
 * ground with its line pattern, as the app's EventBackdropImage paints it.
 * Decorative; fills its container, which owns the size and shape.
 */
export function EventBackdropImage({activityKind, dense = false, mirrored = false, glyph}: EventBackdropImageProps) {
  const [ref, box] = useMeasuredBox<HTMLSpanElement>(initialBox);
  const gradientId = `catch-activity-ground-${useId().replace(/[^\w-]/g, "")}`;
  const tokens = activityArtworkTokenNames(activityKind);
  const axis = activityArtworkGradientAxis(box.width, box.height, mirrored);
  const marks = activityArtworkMarks(activityArtworkPatterns[activityKind], box.width, box.height);
  const style = {"--artwork-accent": `var(${tokens.accent})`, "--artwork-deep": `var(${tokens.deep})`} as CSSProperties;

  return (
    <span ref={ref} className={styles.backdrop} style={style} aria-hidden="true" data-activity-kind={activityKind}>
      <svg className={styles.art} viewBox={`0 0 ${box.width} ${box.height}`} preserveAspectRatio="xMidYMid slice" focusable="false">
        <defs>
          <linearGradient id={gradientId} gradientUnits="userSpaceOnUse" {...axis}>
            {activityArtworkStops(dense).map((stop) => (
              <stop key={stop.offset} offset={stop.offset} className={stop.color === "accent" ? styles.accentStop : styles.deepStop} />
            ))}
          </linearGradient>
        </defs>
        <rect width={box.width} height={box.height} fill={`url(#${gradientId})`} />
        <g className={styles.marks} strokeWidth={activityArtworkStrokeWidth} strokeLinecap="round">
          {marks.map(renderMark)}
        </g>
      </svg>
      {glyph != null ? <span className={styles.glyph}>{glyph}</span> : null}
    </span>
  );
}

function renderMark(mark: ActivityArtworkMark, index: number) {
  switch (mark.shape) {
  case "circle":
    return <circle key={index} className={paintClass(mark.paint)} cx={mark.cx} cy={mark.cy} r={mark.r} />;
  case "line":
    return <line key={index} x1={mark.x1} y1={mark.y1} x2={mark.x2} y2={mark.y2} />;
  case "rect":
    return <rect key={index} className={paintClass(mark.paint)} x={mark.x} y={mark.y} width={mark.width} height={mark.height} rx={mark.rx || undefined} />;
  case "path":
    return <path key={index} className={styles.stroke} d={mark.d} />;
  }
}

function paintClass(paint: "fill" | "stroke") {
  return paint === "fill" ? styles.fill : styles.stroke;
}
