// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/catch_whatsapp_ingress_evidence.schema.json.

const schemaCatchWhatsappIngressEvidenceDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/catch_whatsapp_ingress_evidence.schema.json',
  'title': 'CatchWhatsappIngressEvidenceDocument',
  'description': 'Body-free durable semantic collision fence captured only after authenticated exact-sender ingress. Hashes never establish source completeness, consent or STOP absence. Blocked events cannot be reactivated; no TTL.',
  'x-firestore-collection': 'catchWhatsappIngressEvidence',
  'x-firestore-path': 'catchWhatsappIngressEvidence/{eventId}',
  'x-document-id-field': 'eventId',
  'x-owner': 'Catch signed webhook ingress',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'schemaVersion',
    'eventId',
    'wabaId',
    'phoneNumberId',
    'endpointHash',
    'materialSha256',
    'eventKind',
    'classification',
    'ambiguity',
    'state',
    'receivedAtMillis',
  ],
  'properties': <String, Object?>{
    'schemaVersion': <String, Object?>{
      'const': 1,
    },
    'eventId': <String, Object?>{
      'type': 'string',
      'pattern': '^cwhe_[a-f0-9]{64}\$',
    },
    'wabaId': <String, Object?>{
      'type': 'string',
      'pattern': '^[0-9]{1,32}\$',
    },
    'phoneNumberId': <String, Object?>{
      'type': 'string',
      'pattern': '^[0-9]{1,32}\$',
    },
    'endpointHash': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'pattern': '^[a-f0-9]{64}\$',
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'materialSha256': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
    'eventKind': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'inbound',
        'status',
      ],
    },
    'classification': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'text',
        'stop',
        'status',
        'ambiguous',
      ],
    },
    'ambiguity': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'unresolved-endpoint',
            'truncated-text',
            'unsupported-message',
            'missing-text',
            'invalid-status-errors',
          ],
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'state': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'accepted',
        'blocked',
      ],
    },
    'receivedAtMillis': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
    },
  },
};
