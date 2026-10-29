import {useLocation, useNavigate} from "react-router";
import type {HomeCatalog} from "./homeTypes";
import {ExplorePageSections} from "./sections/explorePageSections";
import {useExplorePageController} from "./useExplorePageController";

/**
 * Explore (CAT-261): `/explore/` and each city page (`/mumbai/`), the
 * linkable form of Explore's city state. The organiser directory redirects
 * here with `show=organisers`.
 */
export function ExplorePage({catalog}: {catalog: HomeCatalog}) {
  const location = useLocation();
  const navigate = useNavigate();
  const explore = useExplorePageController(catalog, location, (href, options) => navigate(href, options));
  return <ExplorePageSections explore={explore} />;
}
