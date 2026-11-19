import type {AdminGetDiscoverySettingsCallableResponse} from
  "../../generated/contracts/adminGetDiscoverySettingsCallableResponse";
import type {AdminUpdateDiscoverySettingsCallablePayload} from
  "../../generated/contracts/adminUpdateDiscoverySettingsCallablePayload";

/**
 * Sample-mode stand-in for Settings → Discovery. It holds state in memory so
 * a sample walkthrough sees the rules it just saved, the way the live screen
 * does. The defaults match the ones the Functions read model falls back to:
 * only organisers on Catch appear anywhere.
 */

type Rules = AdminGetDiscoverySettingsCallableResponse["defaults"];
type Settings = AdminGetDiscoverySettingsCallableResponse["settings"];

const sampleNow = Date.parse("2026-11-19T09:30:00.000Z");
const sampleUid = "sample-owner";

const onCatchOnly = () => ({onCatch: true, notOnCatch: false});

const defaultRules = (): Rules => ({
  surfaces: {
    homeOrganizers: onCatchOnly(),
    cityOrganizers: onCatchOnly(),
    plans: onCatchOnly(),
    totals: onCatchOnly(),
  },
  homeOrganizersMinimum: 1,
  homeClaimAction: false,
});

const seedSettings = (): Settings => ({
  ...defaultRules(),
  updatedAtMillis: null,
  updatedByUid: null,
});

let settings = seedSettings();

/** Restores the seed state between tests and stories. */
export function resetSampleDiscovery(): void {
  settings = seedSettings();
}

function settingsResponse(): AdminGetDiscoverySettingsCallableResponse {
  return {settings, defaults: defaultRules()};
}

export function sampleGetDiscoverySettings():
  AdminGetDiscoverySettingsCallableResponse {
  return settingsResponse();
}

export function sampleUpdateDiscoverySettings(
  payload: AdminUpdateDiscoverySettingsCallablePayload
): AdminGetDiscoverySettingsCallableResponse {
  settings = {...payload, updatedAtMillis: sampleNow,
    updatedByUid: sampleUid};
  return settingsResponse();
}
