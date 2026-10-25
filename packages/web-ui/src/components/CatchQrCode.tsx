import type {CSSProperties} from "react";
import qrcode from "qrcode-generator";
import styles from "./CatchQrCode.module.css";

/**
 * Rendered width: 96, 112 or 160px. A value long enough to need more than
 * 3px a module grows the code past its size so it still scans.
 */
export type CatchQrCodeSize = "s" | "m" | "l";

/** QR error correction: L 7%, M 15%, Q 25%, H 30% of the code can be lost. */
export type CatchQrCodeErrorCorrection = "L" | "M" | "Q" | "H";

export interface CatchQrCodeProps {
  /** Defaults to M. */
  errorCorrection?: CatchQrCodeErrorCorrection;
  /** The accessible name, such as "QR code for carterroadrunners.club". */
  label: string;
  /** Defaults to m. */
  size?: CatchQrCodeSize;
  /** The text to encode, usually a URL. */
  value: string;
}

// Two modules of quiet zone, which phone cameras read reliably at these sizes.
const quietZone = 2;

/** The UTF-8 bytes of `value` as a byte string, which the encoder's byte mode reads. */
function utf8ByteString(value: string) {
  return Array.from(new TextEncoder().encode(value), (byte) => String.fromCharCode(byte)).join("");
}

/** One SVG path for the dark modules, joining horizontal runs. */
export function qrModulePath(value: string, errorCorrection: CatchQrCodeErrorCorrection = "M") {
  const code = qrcode(0, errorCorrection);
  code.addData(utf8ByteString(value), "Byte");
  code.make();
  const count = code.getModuleCount();
  const runs: string[] = [];
  for (let row = 0; row < count; row += 1) {
    for (let column = 0; column < count; column += 1) {
      if (!code.isDark(row, column)) continue;
      const start = column;
      while (column + 1 < count && code.isDark(row, column + 1)) column += 1;
      runs.push(`M${start + quietZone} ${row + quietZone}h${column - start + 1}v1h-${column - start + 1}z`);
    }
  }
  return {extent: count + quietZone * 2, path: runs.join("")};
}

/**
 * A scannable QR code drawn as one SVG path in ink on white, with a quiet zone
 * and rounded corners. It reads as one image with the caller's label.
 */
export function CatchQrCode({errorCorrection = "M", label, size = "m", value}: CatchQrCodeProps) {
  const {extent, path} = qrModulePath(value, errorCorrection);
  return (
    <svg
      aria-label={label}
      className={styles.code}
      data-size={size}
      role="img"
      shapeRendering="crispEdges"
      style={{"--catch-qr-modules": extent} as CSSProperties}
      viewBox={`0 0 ${extent} ${extent}`}
    >
      <rect className={styles.background} height={extent} width={extent} />
      <path className={styles.modules} d={path} />
    </svg>
  );
}
