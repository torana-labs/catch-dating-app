// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/export_organizer_contacts_response.schema.json.

const schemaExportOrganizerContactsCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/export_organizer_contacts_response.schema.json',
  'title': 'ExportOrganizerContactsCallableResponse',
  'description': 'Bounded UTF-8 CRM CSV that omits private Event Success, dating, feedback, and safety answers.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'organizerId',
    'fileName',
    'csv',
    'rowCount',
    'truncated',
    'generatedAtMillis',
    'sourceCoverage',
  ],
  'properties': <String, Object?>{
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'fileName': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'csv': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 5000000,
    },
    'rowCount': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 2500,
    },
    'truncated': <String, Object?>{
      'type': 'boolean',
    },
    'generatedAtMillis': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
    },
    'sourceCoverage': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'exact',
        'partial',
      ],
    },
  },
};
