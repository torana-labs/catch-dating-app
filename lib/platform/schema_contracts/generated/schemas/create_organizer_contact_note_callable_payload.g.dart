// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/create_organizer_contact_note_payload.schema.json.

const schemaCreateOrganizerContactNoteCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/create_organizer_contact_note_payload.schema.json',
  'title': 'CreateOrganizerContactNoteCallablePayload',
  'description': 'Manager-authorized request to append an organizer contact note.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'organizerId',
    'contactId',
    'body',
  ],
  'properties': <String, Object?>{
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'contactId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'body': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 2000,
    },
  },
};
