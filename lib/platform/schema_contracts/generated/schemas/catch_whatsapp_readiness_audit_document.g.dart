// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/catch_whatsapp_readiness_audit.schema.json.

const schemaCatchWhatsappReadinessAuditDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/catch_whatsapp_readiness_audit.schema.json',
  'title': 'CatchWhatsappReadinessAuditDocument',
  'description': 'Immutable server-only provisioning audit created with approval consumption and readiness mutation. Hashes bind archive, exact readiness and independently audited external authority fence. No TTL or private message/contact content.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'schemaVersion',
    'auditId',
    'approvalId',
    'action',
    'projectId',
    'actorUid',
    'atMillis',
    'provenanceSha256',
    'recordSha256',
    'readinessId',
    'authorityFenceSha256',
  ],
  'properties': <String, Object?>{
    'schemaVersion': <String, Object?>{
      'type': 'integer',
      'const': 1,
    },
    'auditId': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9_-]{1,128}\$',
      'minLength': 1,
      'maxLength': 128,
    },
    'approvalId': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9_-]{1,128}\$',
      'minLength': 1,
      'maxLength': 128,
    },
    'action': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'create',
        'revoke',
      ],
    },
    'projectId': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-z][a-z0-9-]{4,28}[a-z0-9]\$',
      'minLength': 6,
      'maxLength': 30,
    },
    'actorUid': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9_-]{1,128}\$',
      'minLength': 1,
      'maxLength': 128,
    },
    'atMillis': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
    },
    'provenanceSha256': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'pattern': '^[a-f0-9]{64}\$',
          'minLength': 64,
          'maxLength': 64,
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'recordSha256': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
      'minLength': 64,
      'maxLength': 64,
    },
    'readinessId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 72,
      'pattern': '^cwready_[a-f0-9]{64}\$',
    },
    'authorityFenceSha256': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
      'minLength': 64,
      'maxLength': 64,
    },
  },
  'x-firestore-collection': 'catchWhatsappReadinessAudits',
  'x-firestore-path': 'catchWhatsappReadinessAudits/{auditId}',
  'x-document-id-field': 'auditId',
  'x-owner': 'Catch support readiness provisioning',
};
