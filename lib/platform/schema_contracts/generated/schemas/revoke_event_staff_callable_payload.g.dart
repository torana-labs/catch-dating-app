// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/revoke_event_staff_payload.schema.json.

const schemaRevokeEventStaffCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/revoke_event_staff_payload.schema.json',
  'title': 'RevokeEventStaffCallablePayload',
  'description': 'Organizer-manager request to revoke one event staff member immediately.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'eventId',
    'uid',
    'expectedRevision',
  ],
  'properties': <String, Object?>{
    'eventId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'uid': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'expectedRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
    },
  },
};
