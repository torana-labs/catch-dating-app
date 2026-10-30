// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/admin_refresh_organizer_events_response.schema.json.

const schemaAdminRefreshOrganizerEventsCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/admin_refresh_organizer_events_response.schema.json',
  'title': 'AdminRefreshOrganizerEventsCallableResponse',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'requestId',
    'created',
    'status',
    'urls',
  ],
  'properties': <String, Object?>{
    'requestId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'created': <String, Object?>{
      'type': 'boolean',
      'description': 'False when a retry found the request it made before.',
    },
    'status': <String, Object?>{
      'const': 'queued',
    },
    'urls': <String, Object?>{
      'type': 'array',
      'maxItems': 10,
      'items': <String, Object?>{
        'type': 'string',
        'minLength': 1,
        'maxLength': 2000,
      },
    },
  },
};
