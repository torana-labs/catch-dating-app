import type {CatchAppCaptureImageDevice, CatchAppCaptureImageProps, CatchHeroSectionFragment} from "@catch/web-ui";
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

/**
 * A fragment capture, chosen by slot id: one real widget cut from another
 * capture's screen (its `fragmentOf`), with the spot it was cut from, so the
 * hero lifts it in place. Null when
 * the slot is absent or is not a fragment of `screen`, so a hero shows only
 * cut-outs of its own screen.
 */
export function captureFragment(captures: CaptureSlots, id: string, screen: string): CatchHeroSectionFragment | null {
  const capture = captures[id];
  if (!capture?.screenRect || capture.fragmentOf !== screen) return null;
  return {src: capture.webPath, width: capture.width, height: capture.height, rect: capture.screenRect};
}
