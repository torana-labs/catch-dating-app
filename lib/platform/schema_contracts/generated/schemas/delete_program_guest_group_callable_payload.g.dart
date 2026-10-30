// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/delete_program_guest_group_payload.schema.json.

const schemaDeleteProgramGuestGroupCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/delete_program_guest_group_payload.schema.json',
  'title': 'DeleteProgramGuestGroupCallablePayload',
  'description': 'Delete a program guest group and scrub its id from member programGuests.groupIds in bounded batches.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'programId',
    'groupId',
  ],
  'properties': <String, Object?>{
    'programId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'groupId': <String, Object?>{
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
