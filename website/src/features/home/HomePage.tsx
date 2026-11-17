import {CatchRoot} from "@catch/web-ui";
import type {CaptureSlots} from "../../shared/media/captureSlot";
import type {HomeReview} from "./homeModel";
import type {HomeCatalog} from "./homeTypes";
import {HomePageSections} from "./sections/homeSections";
import {useHomeCity, type HomeCatalogLoader} from "./useHomeCity";
import {useHomePageController} from "./useHomePageController";

/**
 * The homepage (the playbook's homepage board) on the white ground: one
 * city's plans from its cityPlans read model in the board's busy, thin or
 * launching state, around how a night works, the proof and the host band.
 * The browser may swap in the visitor's own city after load (useHomeCity).
 */
export function HomePage({captures, catalog, downloadUrl, loadCatalog, navigate, reviews}: {
  /** The marketing capture slots (src/app/marketingCaptures.ts). */
  captures: CaptureSlots;
  catalog: HomeCatalog;
  /** One link for both stores; the QR code appears once there is one (CAT-204). */
  downloadUrl?: string;
  /** Reads another city's homepage; tests and stories pass a stand-in. */
  loadCatalog?: HomeCatalogLoader;
  navigate?: (href: string) => void;
  /** Published reviews from guests who booked; the proof band quotes one only when there is one. */
  reviews?: readonly HomeReview[];
}) {
  const city = useHomeCity(catalog, loadCatalog);
  const home = useHomePageController(city.catalog, navigate, city.source, reviews);
  return <CatchRoot theme="day"><HomePageSections captures={captures} downloadUrl={downloadUrl} home={home} /></CatchRoot>;
}
