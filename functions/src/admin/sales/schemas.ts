import {COMMERCIAL_ACTION_SCHEMAS, COMMERCIAL_READ_SCHEMAS} from
  "../salesCommercial/schemas";
import Ajv, {type ValidateFunction} from "ajv";
import addFormats from "ajv-formats";
import {HttpsError} from "firebase-functions/v2/https";
import type {SalesMutationAction, SalesReadAction} from "./types";

type Schema = Record<string, unknown>;
const id: Schema = {
  type: "string",
  minLength: 1,
  maxLength: 96,
  pattern: "^[A-Za-z0-9][A-Za-z0-9._:-]*$",
};
const requestId: Schema = {
  type: "string",
  minLength: 8,
  maxLength: 96,
  pattern: "^[A-Za-z0-9][A-Za-z0-9._:-]*$",
};
const note: Schema = {type: "string", minLength: 1, maxLength: 2000};
const shortText: Schema = {type: "string", minLength: 1, maxLength: 160};
const nullableText = (maxLength: number): Schema => {
  return {type: ["string", "null"], maxLength};
};
const nullableId: Schema = {anyOf: [id, {type: "null"}]};
const dateTime: Schema = {type: "string", format: "date-time"};
const nullableDateTime: Schema = {anyOf: [dateTime, {type: "null"}]};
const revision: Schema = {
  type: "integer",
  minimum: 0,
  maximum: 1_000_000_000,
};
const listLimit: Schema = {type: "integer", minimum: 1, maximum: 50};
const cursor: Schema = {type: "string", minLength: 1, maxLength: 512};
const researchStatus: Schema = {
  enum: [
    "new",
    "needs_research",
    "ready_for_review",
    "qualified",
    "benchmark_only",
    "no_fit",
    "archived",
  ],
};
const taskKind: Schema = {
  enum: [
    "research",
    "reply",
    "follow_up",
    "demo",
    "pilot",
    "duplicate_review",
    "opt_out",
    "service_commitment",
  ],
};
const taskStatus: Schema = {enum: ["open", "completed", "cancelled"]};
const opportunityStage: Schema = {
  enum: [
    "new_enquiry",
    "ready_to_contact",
    "contacted",
    "in_conversation",
    "demo_arranged",
    "demo_completed",
    "pilot_agreed",
    "pilot_running",
    "commercial_discussion",
    "closed_won",
    "closed_lost",
  ],
};
const strict = (
  required: string[],
  properties: Record<string, unknown>,
): Schema => ({
  type: "object",
  additionalProperties: false,
  required,
  properties,
});
const page = (extra: Record<string, unknown> = {}): Schema =>
  strict([], {limit: listLimit, cursor, ...extra});

const historyEntry = strict(["sourceColumn", "sourceValue", "kind",
  "occurredAt", "dateSourceColumn", "dateSourceValue"], {
  sourceColumn: {type: "string", minLength: 1, maxLength: 160},
  sourceValue: {type: "string", minLength: 1, maxLength: 2000},
  kind: {enum: ["activity", "observation", "benchmark"]},
  occurredAt: {anyOf: [{type: "string", format: "date-time", maxLength: 48},
    {type: "null"}]},
  dateSourceColumn: {anyOf: [
    {type: "string", minLength: 1, maxLength: 160}, {type: "null"}]},
  dateSourceValue: {anyOf: [
    {type: "string", minLength: 1, maxLength: 160}, {type: "null"}]},
});
const historyPacket = {
  sourceId: id, contentHash: {type: "string", pattern: "^[a-f0-9]{64}$"},
  mappingVersion: id, promotionVersion: id,
  rows: {type: "array", minItems: 1, maxItems: 10,
    items: strict(["importId", "sourceRowId", "organizerId", "disposition",
      "reason", "entries"], {importId: id, sourceRowId: id, organizerId: id,
      disposition: {enum: ["promoted", "skipped", "review_needed"]},
      reason: {type: "string", minLength: 1, maxLength: 300},
      entries: {type: "array", minItems: 0, maxItems: 5,
        items: historyEntry}})},
};
const historyList = strict(["organizerId"], {organizerId: id,
  limit: {type: "integer", minimum: 1, maximum: 25}, cursor: id});

export const SALES_READ_SCHEMAS: Record<SalesReadAction, Schema> = {
  ...COMMERCIAL_READ_SCHEMAS,
  "imports.history.preview": strict(
    Object.keys(historyPacket), historyPacket),
  "imports.history.list": historyList,
  "imports.history.rows.list": historyList,
  "hosts.search": page({
    query: {
      type: "string",
      minLength: 2,
      maxLength: 80,
      pattern: "^[A-Za-z0-9]+$",
    },
    ownerUid: id,
    researchStatus,
  }),
  "hosts.get": strict(["organizerId"], {organizerId: id}),
  "tasks.list": page({ownerUid: id, status: taskStatus}),
  "opportunities.list": page({ownerUid: id, stage: opportunityStage}),
  "fields.list": strict([], {}),
  "receipts.get": strict(["requestId"], {requestId}),
  "intents.list": page({
    status: {enum: ["needs_identity_review", "linked", "dismissed"]},
  }),
  "contacts.list": strict(["organizerId"], {
    organizerId: id,
    limit: listLimit,
    cursor,
  }),
  "evidence.list": strict(["organizerId"], {
    organizerId: id,
    limit: listLimit,
    cursor,
  }),
  "evidenceProposals.list": strict(["organizerId"], {
    organizerId: id, limit: listLimit, cursor,
  }),
  "imports.list": strict([], {limit: {type: "integer", minimum: 1, maximum: 25},
    cursor: id}),
  "imports.hosts": strict(["importId"], {importId: id}),
  "imports.preview": strict(
    ["sourceId", "contentHash", "mappingVersion", "rows"],
    {
      sourceId: id,
      contentHash: {type: "string", pattern: "^[a-f0-9]{64}$"},
      mappingVersion: id,
      rows: {
        type: "array",
        minItems: 1,
        maxItems: 25,
        items: strict(
          ["sourceRowId", "organizerId", "name", "researchStatus"],
          {
            sourceRowId: id,
            organizerId: nullableId,
            cohortIds: {type: "array", maxItems: 30,
              uniqueItems: true, items: id},
            name: shortText,
            researchStatus,
            summary: nullableText(1200),
            originalCells: {type: "array", maxItems: 60,
              items: strict(["column", "value"], {
                column: {type: "string", maxLength: 160},
                value: {type: "string", maxLength: 2000},
              })},
            originalScore: {
              anyOf: [
                {
                  type: "object",
                  maxProperties: 12,
                  propertyNames: {
                    type: "string",
                    maxLength: 64,
                    pattern: "^[A-Za-z][A-Za-z0-9 _.-]*$",
                  },
                  additionalProperties: {
                    anyOf: [
                      {type: "string", maxLength: 500},
                      {type: "number"},
                      {type: "boolean"},
                      {type: "null"},
                    ],
                  },
                },
                {type: "null"},
              ],
            },
          },
        ),
      },
    },
  ),
  "imports.compensation.preview": strict(
    ["importId", "organizerId"], {importId: id, organizerId: id}),
};

const baseActionSchemas = {
  "hosts.create": strict(["organizerId", "requestId"], {
    organizerId: id,
    requestId,
  }),
  "hosts.update": strict(
    ["organizerId", "requestId", "expectedRevision", "patch"],
    {
      organizerId: id,
      requestId,
      expectedRevision: revision,
      patch: {
        type: "object",
        additionalProperties: false,
        minProperties: 1,
        properties: {
          researchStatus,
          assignedOwnerUid: nullableId,
          summary: nullableText(1200),
          nextAction: nullableText(320),
        },
      },
    },
  ),
  "tasks.upsert": strict(
    ["organizerId", "requestId", "expectedRevision", "task"],
    {
      organizerId: id,
      requestId,
      expectedRevision: revision,
      taskId: id,
      task: strict(["kind", "title", "dueAt", "ownerUid", "status"], {
        kind: taskKind,
        title: shortText,
        dueAt: nullableDateTime,
        contactId: nullableId,
        ownerUid: id,
        status: taskStatus,
      }),
    },
  ),
  "opportunities.upsert": strict(
    ["organizerId", "requestId", "expectedRevision", "fields"],
    {
      organizerId: id,
      requestId,
      expectedRevision: revision,
      opportunityId: id,
      financeAttestationId: id,
      transitionReason: {type: "string", minLength: 1, maxLength: 1000},
      fields: strict(
        ["motion", "stage", "ownerUid", "nextStep", "nextStepAt"],
        {
          motion: shortText,
          stage: opportunityStage,
          ownerUid: id,
          nextStep: nullableText(320),
          nextStepAt: nullableDateTime,
        },
      ),
    },
  ),
  "activities.log": strict(
    ["organizerId", "requestId", "type", "occurredAt", "note"],
    {
      organizerId: id,
      requestId,
      opportunityId: id,
      type: {
        enum: [
          "note",
          "reply",
          "call",
          "demo",
          "pilot",
          "correction",
          "outreach_sent_manual",
        ],
      },
      channel: {enum: ["email", "whatsapp", "other"]},
      attestation: {const: "sent_elsewhere_by_actor"},
      occurredAt: dateTime,
      note,
    },
  ),
  "fields.create": strict(["requestId", "field"], {
    requestId,
    field: strict(["fieldId", "label", "type", "recordType"], {
      fieldId: id,
      label: shortText,
      type: {enum: ["string", "number", "boolean", "date", "enum"]},
      recordType: {const: "account"},
      helpText: nullableText(320),
      enumOptions: {
        type: "array",
        maxItems: 20,
        uniqueItems: true,
        items: shortText,
      },
    }),
  }),
  "fields.setValue": strict(
    ["organizerId", "requestId", "expectedRevision", "fieldId", "value"],
    {
      organizerId: id,
      requestId,
      expectedRevision: revision,
      fieldId: id,
      value: {
        anyOf: [
          {type: "string", maxLength: 500},
          {type: "number"},
          {type: "boolean"},
          {type: "null"},
        ],
      },
    },
  ),
  "intents.link": strict(
    ["intentId", "organizerId", "requestId", "expectedRevision"],
    {intentId: id, organizerId: id, requestId, expectedRevision: revision},
  ),
  "imports.apply": strict(
    [
      "requestId",
      "previewHash",
      "sourceId",
      "contentHash",
      "mappingVersion",
      "rows",
    ],
    {
      requestId,
      previewHash: {type: "string", pattern: "^[a-f0-9]{64}$"},
      ...(
        SALES_READ_SCHEMAS["imports.preview"] as {
          properties: Record<string, unknown>;
        }
      ).properties,
    },
  ),
  "imports.compensation.apply": strict(
    ["importId", "organizerId", "requestId", "previewHash", "reason"],
    {importId: id, organizerId: id, requestId,
      previewHash: {type: "string", pattern: "^[a-f0-9]{64}$"},
      reason: note}),
  "contacts.upsert": strict(
    ["organizerId", "requestId", "expectedRevision", "contact", "relationship"],
    {
      organizerId: id,
      requestId,
      expectedRevision: revision,
      contactId: id,
      linkExisting: {type: "boolean"},
      contact: strict(["displayName"], {displayName: shortText}),
      relationship: strict(["role", "decisionInfluence", "primary"], {
        role: shortText,
        decisionInfluence: {
          enum: ["unknown", "decision_maker", "influencer", "operator"],
        },
        primary: {type: "boolean"},
        endpoints: {
          type: "array",
          maxItems: 3,
          items: strict(["kind", "value", "verificationStatus"], {
            kind: {enum: ["email", "phone"]},
            value: {type: "string", minLength: 3, maxLength: 160},
            verificationStatus: {enum: ["unverified", "verified"]},
            evidenceId: nullableId,
          }),
        },
      }),
    },
  ),
  "evidence.add": strict(
    [
      "organizerId",
      "requestId",
      "claimKey",
      "sourceType",
      "sourceRef",
      "observedAt",
      "confidence",
    ],
    {
      organizerId: id,
      contactId: nullableId,
      requestId,
      claimKey: {
        enum: ["identity", "recurrence", "operation", "stack", "other"],
      },
      signalId: id,
      sourceType: {
        enum: ["first_party", "public_web", "human_note", "import_artifact"],
      },
      sourceRef: {type: "string", minLength: 1, maxLength: 320},
      observedAt: dateTime,
      validThrough: nullableDateTime,
      confidence: {enum: ["high", "medium", "low"]},
      normalizedValue: nullableText(500),
      excerpt: nullableText(500),
    },
  ),
  "accounts.setSuppression": strict(
    ["organizerId", "requestId", "expectedRevision", "status", "reason"],
    {
      organizerId: id,
      requestId,
      expectedRevision: revision,
      status: {enum: ["clear", "held", "suppressed"]},
      reason: note,
    },
  ),
  "contacts.setContactability": strict(
    [
      "organizerId",
      "contactId",
      "requestId",
      "expectedRevision",
      "status",
      "reason",
    ],
    {
      organizerId: id,
      contactId: id,
      requestId,
      expectedRevision: revision,
      status: {enum: ["unknown", "draft_reviewed", "held", "suppressed"]},
      reason: note,
      evidenceId: nullableId,
    },
  ),
};

export const SALES_ACTION_SCHEMAS: Record<SalesMutationAction, Schema> = {
  ...baseActionSchemas,
  ...COMMERCIAL_ACTION_SCHEMAS,
  "imports.history.apply": strict(
    [...Object.keys(historyPacket), "requestId", "previewHash"], {
      ...historyPacket, requestId: id,
      previewHash: {type: "string", pattern: "^[a-f0-9]{64}$"},
    }),
  "evidence.propose": baseActionSchemas["evidence.add"],
  "evidence.reviewProposal": strict(
    ["organizerId", "requestId", "proposalId", "expectedRevision",
      "decision", "reason"], {
      organizerId: id, requestId, proposalId: id,
      expectedRevision: revision,
      decision: {enum: ["accept", "reject"]}, reason: note,
    }),
};

const ajv = new Ajv({allErrors: true, strict: true});
addFormats(ajv);
const readValidators = Object.fromEntries(
  Object.entries(SALES_READ_SCHEMAS).map(([action, schema]) => [
    action,
    ajv.compile(schema),
  ]),
) as Record<SalesReadAction, ValidateFunction>;
const actionValidators = Object.fromEntries(
  Object.entries(SALES_ACTION_SCHEMAS).map(([action, schema]) => [
    action,
    ajv.compile(schema),
  ]),
) as Record<SalesMutationAction, ValidateFunction>;

export function validateSalesRead(
  action: SalesReadAction,
  payload: unknown,
): void {
  assertValid(readValidators[action], payload);
}

export function validateSalesAction(
  action: SalesMutationAction,
  payload: unknown,
): void {
  assertValid(actionValidators[action], payload);
}

function assertValid(validator: ValidateFunction, payload: unknown): void {
  if (!validator) {
    throw new HttpsError("invalid-argument", "Unknown Sales action.");
  }
  let bytes: number;
  try {
    bytes = Buffer.byteLength(JSON.stringify(payload), "utf8");
  } catch {
    throw new HttpsError("invalid-argument", "Sales payload is not JSON.");
  }
  if (bytes > 128 * 1024) {
    throw new HttpsError(
      "invalid-argument",
      "Sales payload exceeds the 128 KiB limit.",
    );
  }
  if (validator(payload)) return;
  const detail = (validator.errors ?? [])
    .map((error) => {
      const property =
        error.keyword === "additionalProperties" ?
          String(error.params.additionalProperty) :
          "";
      const path = error.instancePath || "/";
      const fullPath = `${path}${property ? `/${property}` : ""}`;
      return `${fullPath}: ${error.message}`;
    })
    .join("; ");
  throw new HttpsError("invalid-argument", detail);
}
