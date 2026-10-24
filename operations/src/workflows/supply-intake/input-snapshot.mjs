import {hashValue} from "../../platform/canonical-json.mjs";
import {OperationsError, invariant} from "../../platform/errors.mjs";

export const SUPPLY_INPUT_SNAPSHOT_VERSION = 1;
export const MAX_SUPPLY_INPUT_RECORDS_PER_KIND = 10_000;

const ARRAY_FIELDS = Object.freeze([
  "sourceResults",
  "eventCandidates",
  "organizerPublicationPackets",
  "organizerSearchCandidates",
  "externalEventCandidates",
  "organizerLeads",
  "crawlSurfaces",
  "intakeListings",
]);

export function emptySupplyInputSnapshot(market) {
  return finalizeSupplyInputSnapshot({
    schemaVersion: SUPPLY_INPUT_SNAPSHOT_VERSION,
    snapshotId: `empty-${market}`,
    market,
    observedAt: null,
    provenance: {
      source: "operations_empty_state",
      sourceRunIds: [],
    },
    organizerReviewPolicy: null,
    sourceResults: [],
    eventCandidates: [],
    organizerPublicationPackets: [],
    organizerSearchCandidates: [],
    externalEventCandidates: [],
    organizerLeads: [],
    crawlSurfaces: [],
    intakeListings: [],
  });
}

export function finalizeSupplyInputSnapshot(value) {
  const snapshot = structuredClone(value);
  invariant(
    snapshot?.schemaVersion === SUPPLY_INPUT_SNAPSHOT_VERSION,
    "INVALID_SUPPLY_INPUT",
    "Supply Intake input snapshot has an unsupported schema version."
  );
  invariant(
    /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,239}$/.test(snapshot.snapshotId ?? ""),
    "INVALID_SUPPLY_INPUT",
    "Supply Intake input snapshot id is invalid."
  );
  invariant(
    /^[a-z][a-z0-9-]{1,49}$/.test(snapshot.market ?? ""),
    "INVALID_SUPPLY_INPUT",
    "Supply Intake input snapshot market is invalid."
  );
  invariant(
    snapshot.observedAt === null ||
      (typeof snapshot.observedAt === "string" &&
        !Number.isNaN(Date.parse(snapshot.observedAt))),
    "INVALID_SUPPLY_INPUT",
    "Supply Intake input observedAt must be ISO-8601 or null."
  );
  invariant(
    snapshot.provenance &&
      typeof snapshot.provenance.source === "string" &&
      snapshot.provenance.source.length > 0 &&
      Array.isArray(snapshot.provenance.sourceRunIds) &&
      snapshot.provenance.sourceRunIds.every((entry) =>
        typeof entry === "string" && entry.length > 0),
    "INVALID_SUPPLY_INPUT",
    "Supply Intake input provenance is incomplete."
  );
  for (const field of ARRAY_FIELDS) {
    invariant(
      Array.isArray(snapshot[field]) &&
        snapshot[field].length <= MAX_SUPPLY_INPUT_RECORDS_PER_KIND,
      "INVALID_SUPPLY_INPUT",
      `Supply Intake input ${field} must be a bounded array.`,
      {field, maximum: MAX_SUPPLY_INPUT_RECORDS_PER_KIND}
    );
  }
  assertNoRawProviderPayload(snapshot);
  const {contentHash: _contentHash, ...content} = snapshot;
  return {
    ...content,
    contentHash: hashValue(content),
  };
}

export function assertSupplyInputSnapshot(value, {market} = {}) {
  const finalized = finalizeSupplyInputSnapshot(value);
  invariant(
    finalized.contentHash === value.contentHash,
    "INVALID_SUPPLY_INPUT",
    "Supply Intake input snapshot content hash is stale."
  );
  if (market) {
    invariant(
      finalized.market === market,
      "SUPPLY_INPUT_MARKET_MISMATCH",
      `Supply Intake input snapshot ${finalized.snapshotId} does not match ${market}.`,
      {expectedMarket: market, actualMarket: finalized.market}
    );
  }
  return structuredClone(finalized);
}

export function supplyInputSummary(snapshot) {
  assertSupplyInputSnapshot(snapshot);
  return Object.fromEntries(ARRAY_FIELDS.map((field) => [
    field,
    snapshot[field].length,
  ]));
}

function assertNoRawProviderPayload(value, path = "") {
  if (Array.isArray(value)) {
    value.forEach((entry, index) =>
      assertNoRawProviderPayload(entry, `${path}[${index}]`));
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, entry] of Object.entries(value)) {
    const normalized = key.toLowerCase().replaceAll("_", "");
    if ([
      "rawpayload",
      "providerpayload",
      "rawproviderpayload",
      "providerresponsebody",
      "htmlbody",
    ].includes(normalized)) {
      throw new OperationsError(
        "RAW_PROVIDER_PAYLOAD_FORBIDDEN",
        `Raw provider payload field ${path ? `${path}.` : ""}${key} cannot enter an Operations input snapshot.`
      );
    }
    assertNoRawProviderPayload(entry, path ? `${path}.${key}` : key);
  }
}
