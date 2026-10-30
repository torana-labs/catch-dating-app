// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/sales_demo_continuations.schema.json.

const schemaSalesDemoContinuationDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/sales_demo_continuations.schema.json',
  'title': 'SalesDemoContinuationDocument',
  'description': 'Bounded own completed-demo proof for private claim review delay. Contains references and hashes, never grant tokens or synthetic guest data. Every resume rechecks current identity, scope and real manager authority before Forms materialization.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'schemaVersion',
    'classification',
    'continuationId',
    'actorUid',
    'organizerId',
    'invitationId',
    'invitationRevision',
    'invitationExpiresAt',
    'blueprintId',
    'blueprintRevision',
    'sessionId',
    'sessionRevision',
    'setupHash',
    'completedAt',
    'createdAt',
    'expiresAt',
  ],
  'properties': <String, Object?>{
    'schemaVersion': <String, Object?>{
      'const': 1,
    },
    'classification': <String, Object?>{
      'const': 'sales_private',
    },
    'continuationId': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
    'actorUid': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9_-]{3,128}\$',
    },
    'organizerId': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9_-]{3,128}\$',
    },
    'invitationId': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9_-]{3,128}\$',
    },
    'invitationRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
    },
    'invitationExpiresAt': <String, Object?>{
      'type': 'string',
      'format': 'date-time',
    },
    'blueprintId': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9_-]{3,128}\$',
    },
    'blueprintRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
    },
    'sessionId': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9_-]{3,128}\$',
    },
    'sessionRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
    },
    'setupHash': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
    'completedAt': <String, Object?>{
      'type': 'string',
      'format': 'date-time',
    },
    'createdAt': <String, Object?>{
      'type': 'string',
      'format': 'date-time',
    },
    'expiresAt': <String, Object?>{
      'type': 'string',
      'format': 'date-time',
    },
  },
  'x-firestore-collection': 'salesDemoContinuations',
  'x-firestore-path': 'salesDemoContinuations/{continuationId}',
  'x-document-id-field': 'continuationId',
  'x-owner': 'private Sales Demo continuation boundary',
};
