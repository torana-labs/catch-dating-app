// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/catch_whatsapp_operator_setup_audits.schema.json.

const schemaCatchWhatsappOperatorSetupAuditDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/catch_whatsapp_operator_setup_audits.schema.json',
  'title': 'CatchWhatsappOperatorSetupAuditDocument',
  'description': 'Create-only, no-TTL private operator setup phase audit. Authority seeds, root activation, receive prepare/finalize and readiness effects commit with their phase/audit in one Firestore transaction. Auth claim replacement remains separately journaled; hashes provide binding, not independent authentication. No token, raw claims, archive or plaintext contact content. Auth-dispatch-intent receipt precedes the external Auth call and permanently consumes its dispatch permit; it is not proof that Auth committed.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'schemaVersion',
    'receiptKind',
    'auditId',
    'operationId',
    'projectId',
    'actorUid',
    'planSha256',
    'scopeSha256',
    'fromPhase',
    'toPhase',
    'revision',
    'atMillis',
    'beforeSha256',
    'afterSha256',
    'effectSha256',
  ],
  'properties': <String, Object?>{
    'schemaVersion': <String, Object?>{
      'const': 1,
      'x-catch-ownership': 'server-only',
    },
    'auditId': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9_-]{1,128}\$',
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
    'actorUid': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9_-]{1,128}\$',
      'x-catch-ownership': 'server-only',
    },
    'planSha256': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
      'x-catch-ownership': 'server-only',
    },
    'scopeSha256': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
      'x-catch-ownership': 'server-only',
    },
    'fromPhase': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
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
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
      'x-catch-ownership': 'server-only',
    },
    'toPhase': <String, Object?>{
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
    'atMillis': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
      'x-catch-ownership': 'server-only',
    },
    'beforeSha256': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'pattern': '^[a-f0-9]{64}\$',
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
      'x-catch-ownership': 'server-only',
    },
    'afterSha256': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
      'x-catch-ownership': 'server-only',
    },
    'effectSha256': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'pattern': '^[a-f0-9]{64}\$',
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
      'x-catch-ownership': 'server-only',
    },
    'receiptKind': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'phase',
        'auth-dispatch-intent',
      ],
      'x-catch-ownership': 'server-only',
    },
  },
  'x-firestore-collection': 'catchWhatsappOperatorSetupAudits',
  'x-firestore-path': 'catchWhatsappOperatorSetupAudits/{auditId}',
  'x-document-id-field': 'auditId',
  'x-owner': 'Catch support operator setup',
};
