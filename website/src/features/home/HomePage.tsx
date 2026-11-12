import {CatchRoot} from "@catch/web-ui";
import type {CaptureSlots} from "../../shared/media/captureSlot";
import type {HomeCatalog} from "./homeTypes";
import {HomePageSections} from "./sections/homeSections";
import {useHomeCity, type HomeCatalogLoader} from "./useHomeCity";
import {useHomePageController} from "./useHomePageController";

/**
 * The homepage (the RbWebHomeV2 board) on the white ground: one city's plans
 * from its cityPlans read model, or its launching-soon state, around the
 * guest story and the host band. The browser may swap in the visitor's own
 * city after load (useHomeCity).
 */
export function HomePage({captures, catalog, downloadUrl, loadCatalog, navigate}: {
  /** The marketing capture slots (src/app/marketingCaptures.ts). */
  captures: CaptureSlots;
  catalog: HomeCatalog;
  /** One link for both stores; the QR code appears once there is one (CAT-204). */
  downloadUrl?: string;
  /** Reads another city's homepage; tests and stories pass a stand-in. */
  loadCatalog?: HomeCatalogLoader;
  navigate?: (href: string) => void;
}) {
  const city = useHomeCity(catalog, loadCatalog);
  const home = useHomePageController(city.catalog, navigate);
  return <CatchRoot theme="day"><HomePageSections captures={captures} downloadUrl={downloadUrl} home={home} /></CatchRoot>;
}
