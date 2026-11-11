import type {CSSProperties, ReactNode} from "react";
import styles from "./CatchDeviceFrame.module.css";

/**
 * The generic hardware a screen is shown in. Nothing in a frame is unique to
 * one maker's devices (no notch, island or side buttons): a phone, a phone
 * with a centred punch-hole camera, or a tablet.
 */
export type CatchDeviceFrameKind = "phone" | "android" | "tablet";

/**
 * A quiet browser window around a desktop capture (proposal W1): a light bar
 * with three dots and an optional address, then the capture at its own
 * aspect. Generic like the devices: no maker's window controls.
 */
export type CatchDeviceFrameWindowKind = "browser";

/** @deprecated Use "phone" for "iphone" and "tablet" for "ipad". */
type CatchDeviceFrameLegacyKind = "iphone" | "ipad";

/** Which way a tablet is held. Phones are always portrait. */
export type CatchDeviceFrameOrientation = "landscape" | "portrait";

/** A slight turn, as the boards set devices at an angle. */
export type CatchDeviceFrameTilt = "none" | "left" | "right";

export interface CatchDeviceFrameProps {
  /** Browser only: the address shown in the bar, such as "catchdates.com/w/meher". Decorative. */
  address?: string;
  /**
   * Runs the device off the bottom edge of the band it sits in (proposal L3):
   * the frame's bottom margin goes negative and the band clips it. Devices
   * only; a browser window never bleeds.
   */
  bleed?: boolean;
  /** The screen, usually an app capture image; it covers the screen from the top. */
  children: ReactNode;
  kind: CatchDeviceFrameKind | CatchDeviceFrameWindowKind | CatchDeviceFrameLegacyKind;
  /** Tablets only; defaults to landscape. */
  orientation?: CatchDeviceFrameOrientation;
  /** Defaults to none. Reduced motion has no effect: the turn is still. */
  tilt?: CatchDeviceFrameTilt;
}

/**
 * One spec per kind. Lengths are shares of a reference side so the frame keeps
 * its proportions at any size: phones measure from the frame width; the
 * tablet's bezel from the frame's short side and its screen radius from the
 * frame's long side.
 */
const specs = {
  phone: {screen: [402, 874], bezel: 0.028, outerRadius: 0.165},
  android: {screen: [412, 915], bezel: 0.03, outerRadius: 0.12, camera: {diameter: 0.03, centreBelowScreenTop: 0.025}},
  tablet: {screen: [1194, 834], bezelOfShortSide: 0.032, screenRadiusOfLongSide: 0.015},
} as const;

const legacyKinds: Record<CatchDeviceFrameLegacyKind, CatchDeviceFrameKind> = {iphone: "phone", ipad: "tablet"};

/** Frame geometry in units of the frame width (W = 1). */
interface CatchDeviceFrameGeometry {
  /** Frame height. */
  height: number;
  /** Bezel on every side. */
  bezel: number;
  screenWidth: number;
  screenHeight: number;
  outerRadius: number;
  innerRadius: number;
  /** Punch-hole camera, centred horizontally. */
  camera?: {diameter: number; centreY: number};
}

function catchDeviceFrameKind(kind: Exclude<CatchDeviceFrameProps["kind"], CatchDeviceFrameWindowKind>): CatchDeviceFrameKind {
  return kind in legacyKinds ? legacyKinds[kind as CatchDeviceFrameLegacyKind] : (kind as CatchDeviceFrameKind);
}

function catchDeviceFrameGeometry(
  kind: CatchDeviceFrameKind,
  orientation: CatchDeviceFrameOrientation = "landscape",
): CatchDeviceFrameGeometry {
  if (kind === "tablet") {
    const {screen, bezelOfShortSide: share, screenRadiusOfLongSide} = specs.tablet;
    const [long, short] = screen;
    if (orientation === "portrait") {
      // The frame width is the short side.
      const bezel = share;
      const screenWidth = 1 - 2 * bezel;
      const screenHeight = (screenWidth * long) / short;
      const height = screenHeight + 2 * bezel;
      const innerRadius = screenRadiusOfLongSide * height;
      return {height, bezel, screenWidth, screenHeight, outerRadius: innerRadius + bezel, innerRadius};
    }
    // The frame height is the short side: H = (1 - 2·share·H)·short/long + 2·share·H.
    const ratio = short / long;
    const height = ratio / (1 + 2 * share * ratio - 2 * share);
    const bezel = share * height;
    const screenWidth = 1 - 2 * bezel;
    const innerRadius = screenRadiusOfLongSide;
    return {height, bezel, screenWidth, screenHeight: height - 2 * bezel, outerRadius: innerRadius + bezel, innerRadius};
  }
  const spec = specs[kind];
  const [width, tall] = spec.screen;
  const screenWidth = 1 - 2 * spec.bezel;
  const screenHeight = (screenWidth * tall) / width;
  const geometry: CatchDeviceFrameGeometry = {
    height: screenHeight + 2 * spec.bezel,
    bezel: spec.bezel,
    screenWidth,
    screenHeight,
    outerRadius: spec.outerRadius,
    innerRadius: spec.outerRadius - spec.bezel,
  };
  if ("camera" in spec) {
    geometry.camera = {diameter: spec.camera.diameter, centreY: spec.bezel + spec.camera.centreBelowScreenTop};
  }
  return geometry;
}

const percent = (share: number) => `${Number((share * 100).toFixed(4))}%`;

/**
 * The geometry as CSS custom properties. Percent radii are elliptical
 * (horizontal share of the width / vertical share of the height), so corners
 * stay circular; insets are shares of the frame's width (left/right) and
 * height (top/bottom).
 */
function frameVariables(geometry: CatchDeviceFrameGeometry): CSSProperties {
  const {height, bezel, screenWidth, screenHeight, outerRadius, innerRadius, camera} = geometry;
  return {
    "--catch-device-aspect": `${Number((1 / height).toFixed(6))}`,
    "--catch-device-radius": `${percent(outerRadius)} / ${percent(outerRadius / height)}`,
    "--catch-device-inset": `${percent(bezel / height)} ${percent(bezel)}`,
    "--catch-device-screen-radius": `${percent(innerRadius / screenWidth)} / ${percent(innerRadius / screenHeight)}`,
    ...(camera ? {
      "--catch-device-camera-size": percent(camera.diameter),
      "--catch-device-camera-top": percent((camera.centreY - camera.diameter / 2) / height),
    } : {}),
  } as CSSProperties;
}

/**
 * A generic device bezel around an app screen, or a browser window around a
 * desktop capture, for showing the Catch apps on the website. The frame is
 * decoration; the screen carries the description.
 */
export function CatchDeviceFrame({address, bleed = false, children, kind, orientation, tilt = "none"}: CatchDeviceFrameProps) {
  if (kind === "browser") {
    return (
      <div className={styles.browser} data-kind="browser" data-tilt={tilt}>
        <div aria-hidden="true" className={styles.bar}>
          <span className={styles.dot} />
          <span className={styles.dot} />
          <span className={styles.dot} />
          {address ? <span className={styles.address}>{address}</span> : null}
        </div>
        <div className={styles.page}>{children}</div>
      </div>
    );
  }
  const canonical = catchDeviceFrameKind(kind);
  const held = canonical === "tablet" ? (orientation ?? "landscape") : "portrait";
  return (
    <div
      className={styles.frame}
      data-bleed={bleed ? "" : undefined}
      data-kind={canonical}
      data-orientation={held}
      data-tilt={tilt}
      style={frameVariables(catchDeviceFrameGeometry(canonical, held))}
    >
      <div className={styles.screen}>{children}</div>
    </div>
  );
}
