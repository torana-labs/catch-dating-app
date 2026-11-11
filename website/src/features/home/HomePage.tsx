import {CatchRoot} from "@catch/web-ui";
import type {CaptureSlots} from "../../shared/media/captureSlot";
import type {HomeCatalog} from "./homeTypes";
import {HomePageSections} from "./sections/homeSections";
import {useHomePageController} from "./useHomePageController";

/**
 * The homepage (the RbWebHomeV2 board) on the white ground: one city's plans
 * from its cityPlans read model, or its launching-soon state, around the
 * guest story and the host band.
 */
export function HomePage({captures, catalog, downloadUrl, navigate}: {
  /** The marketing capture slots (src/app/marketingCaptures.ts). */
  captures: CaptureSlots;
  catalog: HomeCatalog;
  /** One link for both stores; the QR code appears once there is one (CAT-204). */
  downloadUrl?: string;
  navigate?: (href: string) => void;
}) {
  const home = useHomePageController(catalog, navigate);
  return <CatchRoot theme="day"><HomePageSections captures={captures} downloadUrl={downloadUrl} home={home} /></CatchRoot>;
}
