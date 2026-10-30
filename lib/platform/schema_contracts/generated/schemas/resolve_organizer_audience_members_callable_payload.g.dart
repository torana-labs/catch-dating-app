// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/resolve_organizer_audience_members_payload.schema.json.

const schemaResolveOrganizerAudienceMembersCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/resolve_organizer_audience_members_payload.schema.json',
  'title': 'ResolveOrganizerAudienceMembersCallablePayload',
  'description': 'Resolves the explicitly selected organizer contact ids for a static audience editor.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'organizerId',
    'contactIds',
  ],
  'properties': <String, Object?>{
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'contactIds': <String, Object?>{
      'type': 'array',
      'minItems': 0,
      'maxItems': 2500,
      'uniqueItems': true,
      'items': <String, Object?>{
        'type': 'string',
        'minLength': 1,
        'maxLength': 180,
      },
    },
  },
};
