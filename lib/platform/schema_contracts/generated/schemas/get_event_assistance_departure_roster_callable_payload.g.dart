// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/get_event_assistance_departure_roster_payload.schema.json.

const schemaGetEventAssistanceDepartureRosterCallablePayloadSchema = <String, Object?>{
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'context',
    'groupId',
    'attendeeIds',
  ],
  'properties': <String, Object?>{
    'context': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'mode',
        'eventId',
        'organizerId',
      ],
      'properties': <String, Object?>{
        'mode': <String, Object?>{
          'type': 'string',
          'const': 'live',
        },
        'eventId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'organizerId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 2000,
        },
      },
    },
    'groupId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 160,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'attendeeIds': <String, Object?>{
      'type': 'array',
      'items': <String, Object?>{
        'type': 'string',
        'minLength': 1,
        'maxLength': 160,
        'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
      },
      'uniqueItems': true,
      'maxItems': 1000,
    },
  },
  'title': 'GetEventAssistanceDepartureRosterCallablePayload',
};
