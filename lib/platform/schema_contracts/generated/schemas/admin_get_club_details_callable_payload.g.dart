// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/admin_get_club_details_payload.schema.json.

const schemaAdminGetClubDetailsCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/admin_get_club_details_payload.schema.json',
  'title': 'AdminGetClubDetailsCallablePayload',
  'description': 'Callable payload accepted by adminGetClubDetails.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'clubId',
  ],
  'properties': <String, Object?>{
    'clubId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
  },
};
