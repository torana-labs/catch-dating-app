// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/list_organizer_luma_events_response.schema.json.

const schemaListOrganizerLumaEventsCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/list_organizer_luma_events_response.schema.json',
  'title': 'ListOrganizerLumaEventsCallableResponse',
  'description': 'Safe calendar identity and manageable Luma event choices returned after transient key verification.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'calendarName',
    'events',
    'truncated',
  ],
  'properties': <String, Object?>{
    'calendarName': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'events': <String, Object?>{
      'type': 'array',
      'maxItems': 50,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'externalEventId',
          'name',
          'startAtMillis',
        ],
        'properties': <String, Object?>{
          'externalEventId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 240,
          },
          'name': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
          },
          'startAtMillis': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
          },
        },
      },
    },
    'truncated': <String, Object?>{
      'type': 'boolean',
    },
  },
};
