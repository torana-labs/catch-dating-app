// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/event_offer_list_response.schema.json.

const schemaEventOfferListCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/event_offer_list_response.schema.json',
  'title': 'EventOfferListCallableResponse',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'items',
    'nextCursor',
  ],
  'properties': <String, Object?>{
    'items': <String, Object?>{
      'type': 'array',
      'maxItems': 50,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'offerId',
          'eventId',
          'contactId',
          'sourceKind',
          'sourceId',
          'status',
          'effectiveStatus',
          'paymentStatus',
          'revision',
          'generation',
          'expiresAtMillis',
        ],
        'properties': <String, Object?>{
          'offerId': <String, Object?>{
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
          'sourceKind': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'application',
              'formResponse',
            ],
          },
          'sourceId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
            'pattern': '^[A-Za-z0-9_-]{1,180}\$',
          },
          'status': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'draft',
              'offered',
              'withdrawn',
              'expired',
            ],
          },
          'effectiveStatus': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'draft',
              'offered',
              'withdrawn',
              'expired',
            ],
          },
          'paymentStatus': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'none',
              'evidenceSubmitted',
              'hostAttestedReceived',
              'rejected',
            ],
          },
          'revision': <String, Object?>{
            'type': 'integer',
            'minimum': 1,
            'maximum': 9007199254740991,
          },
          'generation': <String, Object?>{
            'type': 'integer',
            'minimum': 1,
            'maximum': 9007199254740991,
          },
          'expiresAtMillis': <String, Object?>{
            'type': 'integer',
            'minimum': 1,
            'maximum': 9007199254740991,
          },
        },
      },
    },
    'nextCursor': <String, Object?>{
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
