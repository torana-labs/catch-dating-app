import type {CatchAppCaptureImageProps} from "@catch/web-ui";
import type {CaptureRecord} from "../ui/primitives";

export type CaptureSlots = Readonly<Record<string, CaptureRecord>>;

/**
 * One marketing capture's image, chosen by slot id, for `CatchAppCaptureImage`
 * to draw. Pages name slots, never image paths, so a renamed or removed
 * capture fails marketingCaptures.test.tsx instead of leaving a stale picture
 * behind. Null when the slot is absent.
 */
export function captureSlot(captures: CaptureSlots, id: string, loading?: "eager" | "lazy"): CatchAppCaptureImageProps | null {
  const capture = captures[id];
  if (!capture) return null;
  return {src: capture.webPath, alt: capture.alt, width: capture.width, height: capture.height, caption: capture.caption, loading};
}
