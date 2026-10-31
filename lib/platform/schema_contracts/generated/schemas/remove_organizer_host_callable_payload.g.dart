// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/remove_organizer_host_payload.schema.json.

const schemaRemoveOrganizerHostCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/remove_club_host_payload.schema.json',
  'title': 'RemoveOrganizerHostCallablePayload',
  'description': 'Callable payload accepted by removeOrganizerHost.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'organizerId',
    'uid',
  ],
  'properties': <String, Object?>{
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'uid': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
  },
};
