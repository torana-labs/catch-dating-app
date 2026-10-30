// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from operations/outreach_drafting_selection.schema.json.

const schemaOutreachDraftingSelectionSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/operations/outreach_drafting_selection.schema.json',
  'title': 'OutreachDraftingSelection',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'organizerId',
    'contactId',
    'opportunityId',
    'language',
    'observationId',
    'capabilityId',
    'referenceId',
    'ctaId',
    'reasonToBlock',
    'omittedIds',
  ],
  'properties': <String, Object?>{
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
    },
    'contactId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
    },
    'opportunityId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
    },
    'language': <String, Object?>{
      'const': 'en',
    },
    'observationId': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
    },
    'capabilityId': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
    },
    'referenceId': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
    },
    'ctaId': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
    },
    'reasonToBlock': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 200,
    },
    'omittedIds': <String, Object?>{
      'type': 'array',
      'maxItems': 20,
      'uniqueItems': true,
      'items': <String, Object?>{
        'type': 'string',
        'minLength': 1,
        'maxLength': 160,
      },
    },
  },
};
