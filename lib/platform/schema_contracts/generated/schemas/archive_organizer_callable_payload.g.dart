// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/archive_organizer_payload.schema.json.

const schemaArchiveOrganizerCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/archive_organizer_payload.schema.json',
  'title': 'ArchiveOrganizerCallablePayload',
  'description': 'Callable payload accepted by archiveOrganizer.',
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
    'reason': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 500,
    },
  },
};
