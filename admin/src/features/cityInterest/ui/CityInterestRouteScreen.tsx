import {useCityInterestController} from "../controllers/useCityInterestController";
import {CityInterestScreen} from "./CityInterestScreen";

/** Interest by city as the shell routes it. */
export function CityInterestRouteScreen() {
  return <CityInterestScreen controller={useCityInterestController()} />;
}
