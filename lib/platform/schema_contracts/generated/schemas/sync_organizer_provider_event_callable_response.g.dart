// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/sync_organizer_provider_event_response.schema.json.

const schemaSyncOrganizerProviderEventCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/sync_organizer_provider_event_response.schema.json',
  'title': 'SyncOrganizerProviderEventCallableResponse',
  'description': 'Safe result of one provider roster reconciliation.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'runId',
    'status',
    'pageCount',
    'receivedCount',
    'createdCount',
    'updatedCount',
    'skippedCount',
    'truncated',
    'replayed',
  ],
  'properties': <String, Object?>{
    'runId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'status': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'completed',
        'partial',
        'failed',
      ],
    },
    'pageCount': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 10,
    },
    'receivedCount': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 250,
    },
    'createdCount': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 250,
    },
    'updatedCount': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 250,
    },
    'skippedCount': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 250,
    },
    'truncated': <String, Object?>{
      'type': 'boolean',
    },
    'replayed': <String, Object?>{
      'type': 'boolean',
    },
  },
};
