import type {HomeCatalog} from "./homeTypes";
import {HomePageSections} from "./sections/homeSections";
import {useHomePageController} from "./useHomePageController";

/**
 * The Website v2 homepage (CAT-260, the WebHomeV2 board): one city's plans
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
  return <HomePageSections downloadUrl={downloadUrl} home={home} />;
}
