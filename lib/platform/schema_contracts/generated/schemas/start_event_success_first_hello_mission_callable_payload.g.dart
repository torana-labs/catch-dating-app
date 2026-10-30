// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/start_event_success_first_hello_mission_payload.schema.json.

const schemaStartEventSuccessFirstHelloMissionCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/start_event_success_first_hello_mission_payload.schema.json',
  'title': 'StartEventSuccessFirstHelloMissionCallablePayload',
  'description': 'Callable payload accepted by startEventSuccessFirstHelloMission.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'eventId',
    'venueSessionToken',
  ],
  'properties': <String, Object?>{
    'eventId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'venueSessionToken': <String, Object?>{
      'type': 'string',
      'minLength': 64,
      'maxLength': 2048,
    },
  },
};
