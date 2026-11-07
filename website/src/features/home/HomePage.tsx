import {CatchRoot} from "@catch/web-ui";
import type {HomeCatalog} from "./homeTypes";
import {HomePageSections} from "./sections/homeSections";
import {useHomePageController} from "./useHomePageController";

/**
 * The homepage (the RbWebHomeV2 board) on the white ground: one city's plans
 * from its cityPlans read model, or its launching-soon state, around the
 * guest story and the host band.
 */
export function HomePage({catalog, downloadUrl, navigate}: {
  catalog: HomeCatalog;
  /** One link for both stores; the QR code appears once there is one (CAT-204). */
  downloadUrl?: string;
  navigate?: (href: string) => void;
}) {
  const home = useHomePageController(catalog, navigate);
  return <CatchRoot theme="day"><HomePageSections downloadUrl={downloadUrl} home={home} /></CatchRoot>;
}
