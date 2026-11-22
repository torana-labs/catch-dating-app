import {setTimeout as delay} from "node:timers/promises";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import {onSchedule} from "firebase-functions/v2/scheduler";

import {
  fetchFlightStatus,
} from "./aeroDataBox";
import {loadFlightProviderConfig, type FlightProviderConfig} from
  "./flightProviderConfig";
import {loadFlightProviderPolicy, pilotAllowsProgram, reserveFlightPoll,
  runFlightPoll,
  type FlightProviderPolicy} from "./flightProviderPolicy";
import {
  refreshDueFlightLegs,
  FlightRefreshDeps,
} from "./flightRefresh";

// The scheduled sweep is the only flight-status refresh. The manual
// refreshProgramTravelLeg callable was retired in Nov 2026: no screen ever
// called it, and the sweep already refreshes every due pilot leg.
function configuredRefreshDeps(config: FlightProviderConfig,
  policy: FlightProviderPolicy): FlightRefreshDeps {
  return {
    now: () => new Date(),
    apiKey: () => config.apiKey,
    pilotLegIds: policy.legIds,
    allowsLeg: (programId, legId) => policy.legIds.includes(legId) &&
      pilotAllowsProgram(policy, programId, Date.now()),
    fetchStatus: async (input) => {
      await delay(1100);
      return runFlightPoll(policy, Date.now,
        (now) => reserveFlightPoll(admin.firestore(), policy, now),
        () => fetchFlightStatus(input));
    },
    // Alerts spend provider credits, including delivery retries. The prepared
    // pilot is polling-only; subscription lifecycle code remains reusable.
  };
}

export const refreshProgramFlightStatuses = onSchedule(
  {
    schedule: "every 15 minutes",
    timeoutSeconds: 540,
    maxInstances: 1,
    timeZone: "Asia/Kolkata",
  },
  async () => {
    const policy = loadFlightProviderPolicy();
    if (!policy) return;
    const config = await loadFlightProviderConfig();
    if (!config) return;
    const summary = await refreshDueFlightLegs(
      admin.firestore(), configuredRefreshDeps(config, policy));
    if (summary.updated + summary.failed > 0) {
      logger.info("Program flight refresh sweep completed", summary);
    }
  },
);
