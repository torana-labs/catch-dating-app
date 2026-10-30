// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/event_offer_preview_response.schema.json.

const schemaEventOfferPreviewCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/event_offer_preview_response.schema.json',
  'title': 'EventOfferPreviewCallableResponse',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'planDigest',
    'rows',
  ],
  'properties': <String, Object?>{
    'planDigest': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
    'rows': <String, Object?>{
      'type': 'array',
      'minItems': 1,
      'maxItems': 25,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'offerId',
          'revision',
          'generation',
          'status',
        ],
        'properties': <String, Object?>{
          'offerId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
            'pattern': '^[A-Za-z0-9_-]{1,180}\$',
          },
          'revision': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
            'maximum': 9007199254740991,
          },
          'generation': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
            'maximum': 9007199254740991,
          },
          'status': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'new',
              'draft',
              'offered',
              'withdrawn',
              'expired',
            ],
          },
        },
      },
    },
  },
};
