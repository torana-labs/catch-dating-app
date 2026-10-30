// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/unmerge_organizer_contacts_payload.schema.json.

const schemaUnmergeOrganizerContactsCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/unmerge_organizer_contacts_payload.schema.json',
  'title': 'UnmergeOrganizerContactsCallablePayload',
  'description': 'Manager request to reverse one organizer contact merge receipt.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'organizerId',
    'mergeReceiptId',
    'idempotencyKey',
  ],
  'properties': <String, Object?>{
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'mergeReceiptId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'idempotencyKey': <String, Object?>{
      'type': 'string',
      'minLength': 8,
      'maxLength': 120,
    },
  },
};
