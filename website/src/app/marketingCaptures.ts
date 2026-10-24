import manifest from "../../public/assets/app-screenshots/manifest.json" with {type: "json"};
import type {CaptureSlots} from "../shared/media/MediaSlot";

/**
 * App captures by slot id, bundled at build time so server-rendered pages
 * and link previews include them. tool/marketing/sync_website_media.mjs
 * writes the manifest from tool/marketing/capture_manifest.json.
 */
export const marketingCaptures: CaptureSlots = Object.fromEntries(
  manifest.captures.map(capture => [capture.id, capture]),
);
