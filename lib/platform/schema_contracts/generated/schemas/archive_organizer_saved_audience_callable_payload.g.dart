// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/archive_organizer_saved_audience_payload.schema.json.

const schemaArchiveOrganizerSavedAudienceCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/archive_organizer_saved_audience_payload.schema.json',
  'title': 'ArchiveOrganizerSavedAudienceCallablePayload',
  'description': 'Archives one reusable CRM audience with optimistic revision control.',
  'x-callable-aliases': <Object?>[
    'archiveOrganizerSavedAudience',
  ],
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'organizerId',
    'audienceId',
    'expectedRevision',
  ],
  'properties': <String, Object?>{
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'audienceId': <String, Object?>{
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
