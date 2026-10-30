// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/create_event_waitlist_offers_payload.schema.json.

const schemaCreateEventWaitlistOffersCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/create_event_waitlist_offers_payload.schema.json',
  'title': 'CreateEventWaitlistOffersCallablePayload',
  'description': 'Callable payload accepted by createEventWaitlistOffers.',
  'x-callable-aliases': <Object?>[
    'createEventWaitlistOffers',
  ],
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'eventId',
    'userIds',
  ],
  'properties': <String, Object?>{
    'eventId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'userIds': <String, Object?>{
      'type': 'array',
      'minItems': 1,
      'maxItems': 25,
      'uniqueItems': true,
      'items': <String, Object?>{
        'type': 'string',
        'minLength': 1,
        'maxLength': 180,
      },
    },
    'expiresInMinutes': <String, Object?>{
      'type': <Object?>[
        'integer',
        'null',
      ],
      'minimum': 5,
      'maximum': 1440,
    },
  },
};
