import type {CatchAppCaptureImageDevice, CatchAppCaptureImageProps} from "@catch/web-ui";
import type {CaptureRecord} from "../ui/primitives";

export type CaptureSlots = Readonly<Record<string, CaptureRecord>>;

/**
 * The frame each capture device is drawn in. These captures are the screen
 * alone, so this frame is the only one. A desktop capture has none here (its
 * browser window carries a page address its caller supplies), nor does the
 * older iphone-17-pro, which the exporter still frames itself.
 */
const captureFrames: Readonly<Record<string, CatchAppCaptureImageDevice>> = {
  "generic-phone": "phone",
  "generic-tablet": "tablet",
};

/**
 * One marketing capture's image, chosen by slot id, for `CatchAppCaptureImage`
 * to draw in its device's frame. Pages name slots, never image paths, so a
 * renamed or removed capture fails marketingCaptures.test.tsx instead of
 * leaving a stale picture behind. Null when the slot is absent.
 */
export function captureSlot(captures: CaptureSlots, id: string, loading?: "eager" | "lazy"): CatchAppCaptureImageProps | null {
  const capture = captures[id];
  if (!capture) return null;
  return {src: capture.webPath, alt: capture.alt, width: capture.width, height: capture.height, caption: capture.caption,
    device: captureFrames[capture.device], loading};
}
