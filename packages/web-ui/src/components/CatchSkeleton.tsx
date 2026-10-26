import type {CSSProperties, ReactNode} from "react";
import styles from "./CatchSkeleton.module.css";

type Extent = number | string;

export type CatchSkeletonProps =
  | {shape: "card"; width?: Extent; height?: number}
  | {shape: "box"; width?: Extent; height: number; radius?: number}
  | {shape: "text"; width?: Extent}
  | {shape: "textBlock"; lines?: number}
  | {shape: "circle"; size?: number}
  | {shape: "custom"; children: ReactNode}
  | {shape: "content"; children: ReactNode; enabled?: boolean};

const extent = (value: Extent | undefined) => (typeof value === "number" ? `${value}px` : value);

/**
 * Flutter's CatchSkeleton: loading paint for one unresolved shape, or derived
 * from the real content while it loads. Loading paint is hidden from
 * assistive technology and takes no input; the caller announces loading.
 */
export function CatchSkeleton(props: CatchSkeletonProps) {
  if (props.shape === "content") {
    const enabled = props.enabled ?? true;
    return enabled ? <div aria-hidden="true" className={styles.content} inert>{props.children}</div> : <>{props.children}</>;
  }
  if (props.shape === "custom") {
    return <span aria-hidden="true" className={styles.custom} inert>{props.children}</span>;
  }
  if (props.shape === "textBlock") {
    const lines = Math.max(props.lines ?? 3, 1);
    return (
      <span aria-hidden="true" className={styles.block}>
        {Array.from({length: lines}, (_, index) => <span className={styles.shade} data-shape="text" key={index} />)}
      </span>
    );
  }
  const style: CSSProperties =
    props.shape === "circle" ? {height: props.size, width: props.size}
      : props.shape === "box" ? {borderRadius: props.radius, height: props.height, width: extent(props.width)}
        : props.shape === "card" ? {height: props.height, width: extent(props.width)}
          : {width: extent(props.width)};
  return <span aria-hidden="true" className={styles.shade} data-shape={props.shape} style={style} />;
}
