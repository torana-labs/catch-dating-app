// Launch gate: once any market city is live, people there need the Consumer
// app, so both Consumer store links must be set. It replaces the website's
// retired VITE_STORE_LINKS_MODE=live check.
//
// City status comes from the website market pack until the markets catalog
// (contracts/catalogs/markets.json) lands. The gate warns for now: the pack
// marks cities live before the apps are on the stores, so an error would block
// every PR. It becomes an error once city statuses are honest.
import path from "node:path";
import {pathToFileURL} from "node:url";

export const LAUNCH_GATE_MODE = "warn";

/** Names of the Consumer store slots a live market still lacks. */
export function launchGateGaps(record, cities) {
  const live = cities.filter((city) => city.status === "live");
  if (live.length === 0) return {live: [], missing: []};
  const missing = ["ios", "android"]
    .filter((platform) => record.stores.consumer[platform] === null)
    .map((platform) => `stores.consumer.${platform}`);
  return {live: live.map((city) => city.label ?? city.id), missing};
}

export function launchGateMessage({live, missing}) {
  if (missing.length === 0) return null;
  return `Launch gate: ${live.join(", ")} ${live.length === 1 ? "is" : "are"} live but ${missing.join(" and ")} ${missing.length === 1 ? "is" : "are"} null in packages/brand/brand.json.`;
}

export async function loadMarketCities(repoRoot) {
  const pack = path.join(repoRoot, "website/src/content/markets/in.ts");
  const {inMarket} = await import(pathToFileURL(pack).href);
  return inMarket.cities;
}
