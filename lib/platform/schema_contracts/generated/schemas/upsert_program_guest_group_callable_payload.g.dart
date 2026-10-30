// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/upsert_program_guest_group_payload.schema.json.

const schemaUpsertProgramGuestGroupCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/upsert_program_guest_group_payload.schema.json',
  'title': 'UpsertProgramGuestGroupCallablePayload',
  'description': 'Create or update an organizer-defined guest group for a program. label and dimension are always supplied; sortOrder preserves the existing value when omitted.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'programId',
    'label',
    'dimension',
  ],
  'properties': <String, Object?>{
    'programId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'groupId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'expectedRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
    },
    'label': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 140,
    },
    'dimension': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 60,
      'description': 'Grouping axis key. Conventional values per program kind (weddings: side/lineage/relation; corporate: company/delegation/country); other keys are allowed.',
    },
    'sortOrder': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 10000,
    },
    'hotelId': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 1,
      'maxLength': 180,
      'description': 'Optional programHotels link — where this group\'s members stay; feeds distance-aware moment lead times. Omitted preserves the existing link; explicit null clears it.',
    },
  },
};
