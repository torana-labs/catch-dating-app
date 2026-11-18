import {CatchRoot} from "@catch/web-ui";
import {useLocation, useNavigate} from "react-router";
import type {CaptureSlots} from "../../shared/media/captureSlot";
import type {HomeCatalog} from "./homeTypes";
import {ExplorePageSections} from "./sections/explorePageSections";
import {useExplorePageController} from "./useExplorePageController";

/**
 * Explore (CAT-261): `/explore/` and each city page (`/mumbai/`), the
 * linkable form of Explore's city state. The organiser directory redirects
 * here with `show=organisers`.
 */
export function ExplorePage({captures, catalog}: {captures?: CaptureSlots; catalog: HomeCatalog}) {
  const location = useLocation();
  const navigate = useNavigate();
  const explore = useExplorePageController(catalog, location, (href, options) => navigate(href, options));
  return <CatchRoot theme="day"><ExplorePageSections captures={captures} explore={explore} /></CatchRoot>;
}
