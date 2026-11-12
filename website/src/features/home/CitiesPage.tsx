import {useNavigate} from "react-router";
import type {HomeCatalog} from "./homeTypes";
import {CitiesPageSections} from "./sections/citiesPageSections";
import {useCitiesPageController} from "./useCitiesPageController";

/** `/cities/`: every city the website lists, by country and status. */
export function CitiesPage({catalog}: {catalog: HomeCatalog}) {
  const navigate = useNavigate();
  const cities = useCitiesPageController(catalog, (href) => navigate(href));
  return <CitiesPageSections cities={cities} />;
}
