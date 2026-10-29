// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/catch_whatsapp_clarifications.schema.json.

const schemaCatchWhatsappClarificationDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/catch_whatsapp_clarifications.schema.json',
  'title': 'CatchWhatsappClarificationDocument',
  'description': 'Catch asked a nominator whether their last message was a nomination or a question, and is waiting for "1" or "2". Keyed by the sender\'s endpoint hash, so each sender has at most one open question; it names the inbound receipt the answer applies to and expires after 24 hours. Keeps no message text.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'catchWhatsappClarifications',
  'x-firestore-path': 'catchWhatsappClarifications/{endpointHash}',
  'x-document-id-field': 'endpointHash',
  'x-owner': 'Catch WhatsApp inbound router',
  'required': <Object?>[
    'schemaVersion',
    'endpointHash',
    'sourceEventId',
    'askedAtMillis',
    'expiresAt',
  ],
  'properties': <String, Object?>{
    'schemaVersion': <String, Object?>{
      'const': 1,
    },
    'endpointHash': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
    'sourceEventId': <String, Object?>{
      'type': 'string',
      'pattern': '^cwhe_[a-f0-9]{64}\$',
    },
    'askedAtMillis': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
    },
    'expiresAt': <String, Object?>{
      'type': 'object',
      'description': 'Serialized Firestore Timestamp fixture shape.',
      'x-firestore-type': 'timestamp',
      'additionalProperties': false,
      'required': <Object?>[
        '_seconds',
        '_nanoseconds',
      ],
      'properties': <String, Object?>{
        '_seconds': <String, Object?>{
          'type': 'integer',
        },
        '_nanoseconds': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 999999999,
        },
      },
      'x-firestore-ttl': true,
    },
  },
};
