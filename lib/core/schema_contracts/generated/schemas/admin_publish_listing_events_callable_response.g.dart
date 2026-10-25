// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/admin_publish_listing_events_response.schema.json.

const schemaAdminPublishListingEventsCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/admin_publish_listing_events_response.schema.json',
  'title': 'AdminPublishListingEventsCallableResponse',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'intakeRequestId',
    'organizerId',
    'executionMode',
    'results',
    'counts',
  ],
  'properties': <String, Object?>{
    'intakeRequestId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'organizerId': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 180,
    },
    'executionMode': <String, Object?>{
      'enum': <Object?>[
        'dry_run',
        'apply',
      ],
    },
    'results': <String, Object?>{
      'type': 'array',
      'maxItems': 60,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'eventWorkItemId',
          'eventId',
          'outcome',
          'blockers',
          'receiptPath',
          'idempotent',
        ],
        'properties': <String, Object?>{
          'eventWorkItemId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
          },
          'eventId': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
            'maxLength': 180,
          },
          'outcome': <String, Object?>{
            'enum': <Object?>[
              'published',
              'would_publish',
              'already_published',
              'withdrawn',
              'blocked',
              'awaiting_staff',
            ],
          },
          'blockers': <String, Object?>{
            'type': 'array',
            'maxItems': 30,
            'items': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 120,
            },
          },
          'receiptPath': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
            'maxLength': 240,
          },
          'idempotent': <String, Object?>{
            'type': 'boolean',
          },
        },
      },
    },
    'counts': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'published',
        'wouldPublish',
        'alreadyPublished',
        'withdrawn',
        'blocked',
      ],
      'properties': <String, Object?>{
        'published': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
        },
        'wouldPublish': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
        },
        'alreadyPublished': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
        },
        'withdrawn': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
        },
        'blocked': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
        },
      },
    },
  },
};
