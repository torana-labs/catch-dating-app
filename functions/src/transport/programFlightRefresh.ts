import {setTimeout as delay} from "node:timers/promises";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import {CallableRequest, onCall} from "firebase-functions/v2/https";
import {onSchedule} from "firebase-functions/v2/scheduler";

import {requireAuth} from "../shared/auth";
import {appCheckCallableOptionsWithLimits} from
  "../shared/callableOptions";
import {checkRateLimit} from "../shared/rateLimit";
import {requireProgramAccess, requireProgramMutable} from
  "../shared/programAuthority";
import {validateCallableWithAjv} from "../shared/validation";
import type {RefreshProgramTravelLegCallablePayload} from
  "../shared/generated/refreshProgramTravelLegCallablePayload";
import type {ProgramMutationCallableResponse} from
  "../shared/generated/programMutationCallableResponse";
import {
  validateRefreshProgramTravelLegCallablePayload,
} from "../shared/generated/validators/refreshProgramTravelLegInput";
import type {ProgramTravelLegDocument} from
  "../shared/generated/firestoreAdminTypes";
import {
  fetchFlightStatus,
} from "./aeroDataBox";
import {loadFlightProviderConfig,
  flightProviderUnavailable, type FlightProviderConfig} from
  "./flightProviderConfig";
import {loadFlightProviderPolicy, pilotAllowsProgram, reserveFlightPoll,
  runFlightPoll,
  type FlightProviderPolicy} from "./flightProviderPolicy";
import {
  refreshDueFlightLegs,
  refreshTravelLegForRequest,
  FlightRefreshDeps,
} from "./flightRefresh";

export interface RefreshDeps extends FlightRefreshDeps {
  firestore: () => FirebaseFirestore.Firestore;
  checkRateLimit: typeof checkRateLimit;
}

function configuredRefreshDeps(config: FlightProviderConfig,
  policy: FlightProviderPolicy): RefreshDeps {
  return {
    firestore: () => admin.firestore(),
    checkRateLimit,
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

export async function refreshProgramTravelLegHandler(
  request: CallableRequest<unknown>,
  deps?: RefreshDeps
): Promise<ProgramMutationCallableResponse> {
  const actorUid = requireAuth(request);
  if (!deps) {
    const policy = loadFlightProviderPolicy();
    if (!policy) return flightProviderUnavailable();
    const config = await loadFlightProviderConfig();
    if (!config) return flightProviderUnavailable();
    deps = configuredRefreshDeps(config, policy);
  }
  const data =
    validateCallableWithAjv<RefreshProgramTravelLegCallablePayload>(
      request,
      validateRefreshProgramTravelLegCallablePayload,
    );
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "refreshProgramTravelLeg", {
    maxRequests: 30, windowMs: 60 * 1000,
  });
  const access = await requireProgramAccess({
    db, programId: data.programId, actorUid,
    now: admin.firestore.Timestamp.fromDate(deps.now()),
  });
  requireProgramMutable(access.program);
  const outcome = await refreshTravelLegForRequest(
    db, data.programId, data.legId, {...deps, syncAlert: undefined});
  const legSnap =
    await db.collection("programTravelLegs").doc(data.legId).get();
  const leg = legSnap.data() as ProgramTravelLegDocument | undefined;
  logger.info("Manual flight refresh completed", {
    legId: data.legId, programId: data.programId, outcome,
  });
  return {
    entityId: data.legId,
    revision: leg?.revision ?? 0,
    alreadyApplied: false,
  };
}

export const refreshProgramTravelLeg = onCall(
  appCheckCallableOptionsWithLimits({timeoutSeconds: 30}),
  async (request) => refreshProgramTravelLegHandler(request),
);

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
