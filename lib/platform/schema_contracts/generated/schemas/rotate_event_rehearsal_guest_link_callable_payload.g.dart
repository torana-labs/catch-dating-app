// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/rotate_event_rehearsal_guest_link_payload.schema.json.

const schemaRotateEventRehearsalGuestLinkCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/rotate_event_rehearsal_guest_link_payload.schema.json',
  'title': 'RotateEventRehearsalGuestLinkCallablePayload',
  'description': 'Revokes prior anonymous viewer tokens and returns a new guest link.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'sessionId',
  ],
  'properties': <String, Object?>{
    'sessionId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
  },
};
