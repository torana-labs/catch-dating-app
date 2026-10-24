import {CatchAppCaptureImage} from "@catch/web-ui";
import type {CaptureRecord} from "../ui/primitives";

export type CaptureSlots = Readonly<Record<string, CaptureRecord>>;

/**
 * One marketing capture, chosen by slot id. Pages name slots, never image
 * paths, so a renamed or removed capture fails mediaSlots.test.ts instead of
 * leaving a stale picture behind. Renders nothing when the slot is absent.
 */
export function MediaSlot({captures, id, loading}: {captures: CaptureSlots; id: string; loading?: "eager" | "lazy"}) {
  const capture = captures[id];
  if (!capture) return null;
  return <CatchAppCaptureImage src={capture.webPath} alt={capture.alt} width={capture.width} height={capture.height}
    caption={capture.caption} loading={loading} />;
}
