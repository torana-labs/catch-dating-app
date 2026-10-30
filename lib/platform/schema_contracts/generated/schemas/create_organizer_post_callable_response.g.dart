// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/create_organizer_post_response.schema.json.

const schemaCreateOrganizerPostCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/create_organizer_post_response.schema.json',
  'title': 'CreateOrganizerPostCallableResponse',
  'description': 'Callable response returned by createOrganizerPost.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'postId',
    'remainingWeeklyQuota',
    'deliveryStatus',
    'recipientCount',
    'excludedCount',
    'activityAvailableCount',
    'pushAttemptedCount',
    'pushAcceptedCount',
    'pushFailedCount',
    'pushUnknownCount',
    'idempotentReplay',
  ],
  'properties': <String, Object?>{
    'postId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'remainingWeeklyQuota': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 3,
    },
    'deliveryStatus': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'pending',
        'completed',
        'partial',
      ],
    },
    'recipientCount': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
    },
    'excludedCount': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
    },
    'activityAvailableCount': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
    },
    'pushAttemptedCount': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
    },
    'pushAcceptedCount': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
    },
    'pushFailedCount': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
    },
    'pushUnknownCount': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
    },
    'idempotentReplay': <String, Object?>{
      'type': 'boolean',
    },
  },
};
