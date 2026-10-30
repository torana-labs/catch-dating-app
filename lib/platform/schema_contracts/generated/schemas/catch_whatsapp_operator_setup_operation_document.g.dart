// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/catch_whatsapp_operator_setup_operations.schema.json.

const schemaCatchWhatsappOperatorSetupOperationDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/catch_whatsapp_operator_setup_operations.schema.json',
  'title': 'CatchWhatsappOperatorSetupOperationDocument',
  'description': 'Permanent project-bound one-time operator setup slot. Never delete, reset or add TTL. Exact private reviewed plan/scope and replay digests bind source SHA, current account incarnations, Google identity, expected absence, fixed capabilities and server-owned readiness references. Phases journal non-atomic Auth/Firestore effects; unknown outcomes are reconciled without blind retry. Internal source only, no client writes or activation by this schema.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'schemaVersion',
    'operationId',
    'projectId',
    'planId',
    'planSha256',
    'replaySha256',
    'scopeSha256',
    'actorUid',
    'recipientUid',
    'phase',
    'revision',
    'updatedAtMillis',
  ],
  'properties': <String, Object?>{
    'schemaVersion': <String, Object?>{
      'const': 1,
      'x-catch-ownership': 'server-only',
    },
    'operationId': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-z][a-z0-9-]{4,28}[a-z0-9]\$',
      'x-catch-ownership': 'server-only',
    },
    'projectId': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-z][a-z0-9-]{4,28}[a-z0-9]\$',
      'x-catch-ownership': 'server-only',
    },
    'planId': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9_-]{1,128}\$',
      'x-catch-ownership': 'server-only',
    },
    'planSha256': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
      'x-catch-ownership': 'server-only',
    },
    'replaySha256': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
      'x-catch-ownership': 'server-only',
    },
    'scopeSha256': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
      'x-catch-ownership': 'server-only',
    },
    'actorUid': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9_-]{1,128}\$',
      'x-catch-ownership': 'server-only',
    },
    'recipientUid': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9_-]{1,128}\$',
      'x-catch-ownership': 'server-only',
    },
    'phase': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'reserved',
        'auth-intent',
        'auth-confirmed',
        'seeded',
        'root-active',
        'prepare-intent',
        'prepared',
        'finalize-intent',
        'complete',
        'publish-intent',
        'published',
        'readiness-intent',
        'ready',
        'revoke-intent',
        'revoked',
      ],
      'x-catch-ownership': 'server-only',
    },
    'revision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 15,
      'x-catch-ownership': 'server-only',
    },
    'updatedAtMillis': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
      'x-catch-ownership': 'server-only',
    },
  },
  'x-firestore-collection': 'catchWhatsappOperatorSetupOperations',
  'x-firestore-path': 'catchWhatsappOperatorSetupOperations/{operationId}',
  'x-document-id-field': 'operationId',
  'x-owner': 'Catch support operator setup',
};
