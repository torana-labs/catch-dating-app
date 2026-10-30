// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/commit_event_offers_payload.schema.json.

const schemaCommitEventOffersCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/commit_event_offers_payload.schema.json',
  'title': 'CommitEventOffersCallablePayload',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'organizerId',
    'eventId',
    'mode',
    'rows',
    'requestId',
    'planDigest',
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
    'mode': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'draft',
        'offer',
      ],
    },
    'rows': <String, Object?>{
      'type': 'array',
      'minItems': 1,
      'maxItems': 25,
      'items': <String, Object?>{
        'title': 'EventOfferRow',
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'organizerId',
          'eventId',
          'contactId',
          'applicationId',
          'sourceKind',
          'expiresAtMillis',
          'organizerPaymentLink',
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
          'contactId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
            'pattern': '^[A-Za-z0-9_-]{1,180}\$',
          },
          'applicationId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
            'pattern': '^[A-Za-z0-9_-]{1,180}\$',
          },
          'sourceKind': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'application',
              'formResponse',
            ],
          },
          'expiresAtMillis': <String, Object?>{
            'type': 'integer',
            'minimum': 1,
            'maximum': 9007199254740991,
          },
          'organizerPaymentLink': <String, Object?>{
            'anyOf': <Object?>[
              <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 2048,
                'format': 'uri',
                'pattern': '^https://',
              },
              <String, Object?>{
                'type': 'null',
              },
            ],
          },
        },
      },
    },
    'requestId': <String, Object?>{
      'type': 'string',
      'minLength': 8,
      'maxLength': 100,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9_-]{7,99}\$',
    },
    'planDigest': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
  },
};
