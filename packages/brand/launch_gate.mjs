// Launch gate: once any market city is live, people there need the Consumer
// app, so both Consumer store links must be set. It replaces the website's
// retired VITE_STORE_LINKS_MODE=live check.
//
// City lifecycles come from contracts/catalogs/markets.json, where only a city
// that is really open is live. The gate still warns: Mumbai and Indore are live
// while stores.consumer.ios and .android are null, so an error would block
// every PR. Flip LAUNCH_GATE_MODE to "error" in the change that sets both links.
import fs from "node:fs";
import path from "node:path";

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

/** Catalog cities as {id, label, status}, status being the city's lifecycle. */
export async function loadMarketCities(repoRoot) {
  const catalog = JSON.parse(fs.readFileSync(path.join(repoRoot, "contracts/catalogs/markets.json"), "utf8"));
  return catalog.cities.map((city) => ({id: city.marketId, label: city.label, status: city.lifecycle}));
}
