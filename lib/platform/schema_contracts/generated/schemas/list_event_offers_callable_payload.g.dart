// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/list_event_offers_payload.schema.json.

const schemaListEventOffersCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/list_event_offers_payload.schema.json',
  'title': 'ListEventOffersCallablePayload',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'organizerId',
    'eventId',
  ],
  'properties': <String, Object?>{
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'pattern': '^[A-Za-z0-9_-]{1,180}\$',
    },
    'eventId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'pattern': '^[A-Za-z0-9_-]{1,180}\$',
    },
    'limit': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 50,
    },
    'afterOfferId': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
          'pattern': '^[A-Za-z0-9_-]{1,180}\$',
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
  },
};
