// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/send_event_broadcast_response.schema.json.

const schemaSendEventBroadcastCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/send_event_broadcast_response.schema.json',
  'title': 'SendEventBroadcastCallableResponse',
  'description': 'Delivery summary returned by sendEventBroadcast.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'broadcastId',
    'status',
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
    'broadcastId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'status': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'completed',
        'partial',
      ],
    },
    'recipientCount': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 500,
    },
    'excludedCount': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 500,
    },
    'activityAvailableCount': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 500,
    },
    'pushAttemptedCount': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 500,
    },
    'pushAcceptedCount': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 500,
    },
    'pushFailedCount': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 500,
    },
    'pushUnknownCount': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 500,
    },
    'idempotentReplay': <String, Object?>{
      'type': 'boolean',
    },
  },
};
