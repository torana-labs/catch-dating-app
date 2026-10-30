// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/organizer_follow_payload.schema.json.

const schemaOrganizerFollowCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/organizer_follow_payload.schema.json',
  'title': 'OrganizerFollowCallablePayload',
  'description': 'Callable payload accepted by followOrganizer and unfollowOrganizer.',
  'x-callable-aliases': <Object?>[
    'followOrganizer',
    'unfollowOrganizer',
  ],
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'organizerId',
  ],
  'properties': <String, Object?>{
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'expectedUid': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 128,
    },
  },
};
