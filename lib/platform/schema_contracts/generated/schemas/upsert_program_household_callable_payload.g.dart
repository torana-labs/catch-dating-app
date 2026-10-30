// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/upsert_program_household_payload.schema.json.

const schemaUpsertProgramHouseholdCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/upsert_program_household_payload.schema.json',
  'title': 'UpsertProgramHouseholdCallablePayload',
  'description': 'Create or update a household invitation grouping for program guests.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'programId',
    'label',
    'primaryContactName',
    'memberGuestIds',
  ],
  'properties': <String, Object?>{
    'programId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'householdId': <String, Object?>{
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
    'primaryContactName': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 140,
    },
    'primaryPhoneE164': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 20,
    },
    'primaryEmail': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 320,
    },
    'memberGuestIds': <String, Object?>{
      'type': 'array',
      'minItems': 0,
      'maxItems': 50,
      'uniqueItems': true,
      'items': <String, Object?>{
        'type': 'string',
        'minLength': 1,
        'maxLength': 180,
      },
    },
    'deliveryPreference': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'whatsapp',
        'sms',
        'email',
        'none',
      ],
    },
    'fieldChoices': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'properties': <String, Object?>{
        'displayName': <String, Object?>{
          'type': 'string',
          'pattern': '^wfa_[a-f0-9]{64}\$',
        },
        'phoneE164': <String, Object?>{
          'type': 'string',
          'pattern': '^wfa_[a-f0-9]{64}\$',
        },
        'email': <String, Object?>{
          'type': 'string',
          'pattern': '^wfa_[a-f0-9]{64}\$',
        },
      },
      'description': 'Explicit same-program, same-household field assertions chosen under expectedRevision.',
    },
  },
};
