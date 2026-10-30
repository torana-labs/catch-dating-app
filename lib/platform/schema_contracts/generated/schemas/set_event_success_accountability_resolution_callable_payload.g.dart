// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/set_event_success_accountability_resolution_payload.schema.json.

const schemaSetEventSuccessAccountabilityResolutionCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/set_event_success_accountability_resolution_payload.schema.json',
  'title': 'SetEventSuccessAccountabilityResolutionCallablePayload',
  'description': 'Host resolution for one currently checked-in operational attendee during an Event Success sweep.',
  'x-callable-aliases': <Object?>[
    'setEventSuccessAccountabilityResolution',
  ],
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'eventId',
    'attendeeId',
    'resolution',
  ],
  'properties': <String, Object?>{
    'eventId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'attendeeId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'resolution': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'returned',
        'departed',
        'unresolved',
      ],
    },
  },
};
