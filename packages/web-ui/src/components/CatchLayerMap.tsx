import {CatchIcon} from "./CatchIcon";
import styles from "./CatchLayerMap.module.css";

export interface CatchLayerMapNode {
  /** The job, such as "Bookings and payments". */
  label: string;
  /** The first layer (0-based) at which Catch runs this job. */
  from: number;
  /** What the host keeps using before then, such as "your WhatsApp groups". */
  yours?: string;
}

export interface CatchLayerMapLabels {
  /** The legend and a running job's foot, such as "Catch runs this". */
  on: string;
  /** The legend for jobs that stay with the host, such as "Stays on your own tools". */
  off: string;
  /** A job Catch runs at every layer, such as "Every layer". */
  everyLayer: string;
  /** A job's first layer, 1-based, such as "From layer 2". */
  fromLayer: (layer: number) => string;
  /** Added to the foot of a job the current layer brings in, such as "new here". */
  newHere: string;
  /** A job the host keeps, such as "You keep your WhatsApp groups". */
  youKeep: (yours: string) => string;
}

export interface CatchLayerMapProps {
  labels: CatchLayerMapLabels;
  /** The layer shown (0-based), usually chosen with a tab bar beside the map. */
  layer: number;
  nodes: readonly CatchLayerMapNode[];
}

/**
 * Which jobs Catch runs at a chosen layer of adoption (proposal WebLayerMap):
 * a legend, then one card per job, solid when Catch runs it and dashed when it
 * stays on the host's own tools. Made for the indigo band.
 */
export function CatchLayerMap({labels, layer, nodes}: CatchLayerMapProps) {
  return (
    <div className={styles.map}>
      <div className={styles.legend}>
        <span className={styles.key}><span aria-hidden="true" className={styles.keyOn}><CatchIcon name="check" size={16} /></span>{labels.on}</span>
        <span className={styles.key}><span aria-hidden="true" className={styles.keyOff} />{labels.off}</span>
      </div>
      <ul className={styles.nodes}>
        {nodes.map((node) => {
          const on = layer >= node.from;
          const isNew = on && node.from === layer && layer > 0;
          return (
            <li className={styles.node} data-new={isNew || undefined} data-on={on || undefined} key={node.label}>
              <div className={styles.top}>
                <span className={styles.from}>{node.from === 0 ? labels.everyLayer : labels.fromLayer(node.from + 1)}</span>
                {on ? <span aria-hidden="true" className={styles.tick}><CatchIcon name="check" size={16} /></span> : <span aria-hidden="true" className={styles.ring} />}
              </div>
              <span className={styles.label}>{node.label}</span>
              <span className={styles.foot}>
                {on ? `${labels.on}${isNew ? ` · ${labels.newHere}` : ""}` : labels.youKeep(node.yours ?? "")}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
