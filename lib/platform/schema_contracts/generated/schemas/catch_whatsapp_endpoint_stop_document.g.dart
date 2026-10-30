// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/catch_whatsapp_endpoint_stops.schema.json.

const schemaCatchWhatsappEndpointStopDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/catch_whatsapp_endpoint_stops.schema.json',
  'title': 'CatchWhatsappEndpointStopDocument',
  'description': 'Private permanent Catch sender/endpoint STOP fence, committed atomically with the immutable authenticated inbound STOP receipt. Independent of UID and organizer contact resolution. No raw endpoint, message body, credentials, TTL, reset or automatic re-enrollment. Ingress wiring and historical reconciliation remain required before outbound activation.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'catchWhatsappEndpointStops',
  'x-firestore-path': 'catchWhatsappEndpointStops/{stopId}',
  'x-document-id-field': 'stopId',
  'x-owner': 'Catch support reply service',
  'required': <Object?>[
    'schemaVersion',
    'stopId',
    'wabaId',
    'phoneNumberId',
    'endpointHash',
    'sourceEventId',
    'sourceMessageId',
    'payloadHash',
    'observedAtMillis',
  ],
  'properties': <String, Object?>{
    'schemaVersion': <String, Object?>{
      'const': 1,
      'type': 'integer',
    },
    'stopId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 71,
      'pattern': '^cwstop_[a-f0-9]{64}\$',
    },
    'wabaId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 32,
      'pattern': '^[0-9]{1,32}\$',
    },
    'phoneNumberId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 32,
      'pattern': '^[0-9]{1,32}\$',
    },
    'endpointHash': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 64,
      'pattern': '^[a-f0-9]{64}\$',
    },
    'sourceEventId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 69,
      'pattern': '^cwhe_[a-f0-9]{64}\$',
    },
    'sourceMessageId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 240,
      'pattern': '^[^\\s\\u0000-\\u001f]+\$',
    },
    'payloadHash': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 64,
      'pattern': '^[a-f0-9]{64}\$',
    },
    'observedAtMillis': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
    },
  },
};
