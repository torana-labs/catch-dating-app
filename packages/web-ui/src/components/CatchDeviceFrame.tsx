import type {ReactNode} from "react";
import styles from "./CatchDeviceFrame.module.css";

/** The hardware a screen is shown in: a phone with a notch, a phone with a camera dot, or a tablet. */
export type CatchDeviceFrameKind = "iphone" | "android" | "ipad";

/** A slight turn, as the boards set devices at an angle. */
export type CatchDeviceFrameTilt = "none" | "left" | "right";

export interface CatchDeviceFrameProps {
  /** The screen, usually an app capture image that fills the frame's width. */
  children: ReactNode;
  kind: CatchDeviceFrameKind;
  /** Defaults to none. Reduced motion has no effect: the turn is still. */
  tilt?: CatchDeviceFrameTilt;
}

/**
 * A device bezel around an app screen, for showing the Catch apps on the
 * website. The frame is decoration; the screen carries the description.
 */
export function CatchDeviceFrame({children, kind, tilt = "none"}: CatchDeviceFrameProps) {
  return (
    <div className={styles.frame} data-kind={kind} data-tilt={tilt}>
      <div className={styles.screen}>{children}</div>
    </div>
  );
}
