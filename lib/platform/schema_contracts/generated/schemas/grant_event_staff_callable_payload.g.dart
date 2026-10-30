// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/grant_event_staff_payload.schema.json.

const schemaGrantEventStaffCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/grant_event_staff_payload.schema.json',
  'title': 'GrantEventStaffCallablePayload',
  'description': 'Organizer-manager request to grant an existing phone-auth account expiring event-operator access.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'eventId',
    'phoneNumber',
    'expiresAtMillis',
  ],
  'properties': <String, Object?>{
    'eventId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'phoneNumber': <String, Object?>{
      'type': 'string',
      'minLength': 8,
      'maxLength': 32,
    },
    'expiresAtMillis': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
    },
  },
};
