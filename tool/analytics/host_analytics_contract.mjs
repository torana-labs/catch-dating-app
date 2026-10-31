// Shared source and live expectations for the host Firestore-to-BigQuery
// exports.
import {createHash} from "node:crypto";

export const hostExportSource = "firebase/firestore-bigquery-export@0.3.2";

export const hostExports = {
  "bq-host-organizers": {
    collectionPath: "organizers",
    tableId: "organizers",
    requiredInMart: true,
  },
  "bq-host-events": {
    collectionPath: "events",
    tableId: "events",
    requiredInMart: true,
  },
  "bq-host-event-participations": {
    collectionPath: "eventParticipations",
    tableId: "event_participations",
    requiredInMart: true,
  },
  "bq-host-payments": {
    collectionPath: "payments",
    tableId: "payments",
    requiredInMart: true,
  },
  "bq-host-reviews": {
    collectionPath: "reviews",
    tableId: "reviews",
    requiredInMart: true,
  },
  "bq-host-saved-events": {
    collectionPath: "savedEvents",
    tableId: "saved_events",
    requiredInMart: true,
  },
  "bq-host-event-invite-links": {
    collectionPath: "eventInviteLinks",
    tableId: "event_invite_links",
    requiredInMart: true,
  },
  "bq-host-matches": {
    collectionPath: "matches",
    tableId: "matches",
    requiredInMart: false,
  },
};

export const hostRawViews = Object.values(hostExports)
  .map(({tableId}) => `${tableId}_raw_latest`).sort();

export function inspectHostExtensions(instances, projectId) {
  const expectedInstances = Object.entries(hostExports).map(([instanceId, expected]) => {
    const matches = instances.filter((instance) => instance?.instanceId === instanceId);
    const instance = matches[0];
    const mismatches = [];
    if (matches.length !== 1) mismatches.push({field: "instanceCount", expected: 1, actual: matches.length});
    const values = {
      state: "ACTIVE",
      extension: hostExportSource.split("@")[0],
      version: hostExportSource.split("@")[1],
    };
    for (const [field, value] of Object.entries(values)) {
      if (instance?.[field] !== value) {
        mismatches.push({field, expected: value, actual: instance?.[field] ?? null});
      }
    }
    const params = {
      COLLECTION_PATH: expected.collectionPath,
      TABLE_ID: expected.tableId,
      BIGQUERY_PROJECT_ID: projectId,
      DATASET_ID: "catch_analytics",
      DATASET_LOCATION: "asia-south1",
      DATABASE: "(default)",
      DATABASE_REGION: "asia-south1",
    };
    for (const [field, value] of Object.entries(params)) {
      if (instance?.params?.[field] !== value) {
        mismatches.push({field, expected: value, actual: instance?.params?.[field] ?? null});
      }
    }
    return {instanceId, ok: mismatches.length === 0, mismatches};
  });
  const unexpectedInstances = instances.filter((instance) =>
    instance?.instanceId?.startsWith("bq-host-") && !Object.hasOwn(hostExports, instance.instanceId)
  ).map(({instanceId}) => ({
    instanceId,
    ok: false,
    mismatches: [{field: "unexpectedInstance", expected: false, actual: true}],
  }));
  return [...expectedInstances, ...unexpectedInstances];
}

export function querySha256(query) {
  return typeof query === "string" ? createHash("sha256").update(query).digest("hex") : null;
}

export function inspectHostSchedule(configs, displayName, expectedQuery) {
  const expectedQuerySha256 = querySha256(expectedQuery);
  const matches = configs.filter((config) =>
    config?.displayName === displayName && config?.dataSourceId === "scheduled_query"
  ).map((config) => ({
    name: config.name ?? config.transferConfigName ?? null,
    displayName: config.displayName,
    state: config.state ?? null,
    disabled: config.disabled === true || config.scheduleOptions?.disableAutoScheduling === true ||
      config.scheduleOptionsV2?.manualSchedule !== undefined,
    querySha256: querySha256(config.params?.query),
    queryMatchesSource: config.params?.query === expectedQuery,
  }));
  return {
    ok: matches.length === 1 && matches[0].name !== null &&
      matches[0].state !== "FAILED" && !matches[0].disabled && matches[0].queryMatchesSource,
    expectedQuerySha256,
    matches,
  };
}
