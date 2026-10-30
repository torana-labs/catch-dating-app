// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/get_organizer_contact_detail_payload.schema.json.

const schemaGetOrganizerContactDetailCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/get_organizer_contact_detail_payload.schema.json',
  'title': 'GetOrganizerContactDetailCallablePayload',
  'description': 'Manager-authorized organizer contact detail request.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'organizerId',
    'contactId',
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
    'includeHistory': <String, Object?>{
      'type': 'boolean',
      'default': true,
      'description': 'False loads overview facts without send, reply, form-response timeline, or merge-history reads. Omission preserves the full response for existing clients.',
    },
  },
};
