// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/organizer_whatsapp_endpoint_stops.schema.json.

const schemaOrganizerWhatsappEndpointStopDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/organizer_whatsapp_endpoint_stops.schema.json',
  'title': 'OrganizerWhatsappEndpointStopDocument',
  'description': 'Latest authenticated text STOP for an organizer and WhatsApp endpoint, independent of CRM contact resolution. No TTL until suppression and consent retention are reconciled.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'schemaVersion',
    'stopId',
    'organizerId',
    'endpointHash',
    'connectionId',
    'providerAccountId',
    'providerPhoneNumberId',
    'providerEventId',
    'payloadHash',
    'stoppedAt',
    'observedAt',
    'revision',
  ],
  'properties': <String, Object?>{
    'schemaVersion': <String, Object?>{
      'type': 'integer',
      'const': 1,
    },
    'stopId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 160,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 160,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'endpointHash': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
    'connectionId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 160,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'providerAccountId': <String, Object?>{
      'type': 'string',
      'pattern': '^[0-9]{5,40}\$',
    },
    'providerPhoneNumberId': <String, Object?>{
      'type': 'string',
      'pattern': '^[0-9]{5,40}\$',
    },
    'providerEventId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 1024,
    },
    'payloadHash': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
    'stoppedAt': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
    },
    'observedAt': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
    },
    'revision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
    },
  },
  'x-firestore-collection': 'organizerWhatsappEndpointStops',
  'x-firestore-path': 'organizerWhatsappEndpointStops/{stopId}',
  'x-document-id-field': 'stopId',
  'x-owner': 'trusted WhatsApp event service workers',
};
