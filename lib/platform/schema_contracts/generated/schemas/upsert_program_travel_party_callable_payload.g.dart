// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/upsert_program_travel_party_payload.schema.json.

const schemaUpsertProgramTravelPartyCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/upsert_program_travel_party_payload.schema.json',
  'title': 'UpsertProgramTravelPartyCallablePayload',
  'description': 'Server-owned ride-together membership for specific travel legs. This is independent of invitation households and does not apply to a guest\'s other journeys.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'programId',
    'legIds',
    'dedicatedVehicle',
  ],
  'properties': <String, Object?>{
    'programId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'partyId': <String, Object?>{
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
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 140,
    },
    'dedicatedVehicle': <String, Object?>{
      'type': 'boolean',
    },
    'legIds': <String, Object?>{
      'type': 'array',
      'minItems': 0,
      'maxItems': 50,
      'uniqueItems': true,
      'items': <String, Object?>{
        'type': 'string',
        'minLength': 1,
        'maxLength': 180,
      },
      'description': 'Explicit travel legs in this ride-together party. Guest identities are derived from those legs. An existing un-dispatched party may be emptied to release its members.',
    },
  },
  'allOf': <Object?>[
    <String, Object?>{
      'if': <String, Object?>{
        'required': <Object?>[
          'partyId',
        ],
      },
      'then': <String, Object?>{
        'required': <Object?>[
          'expectedRevision',
        ],
      },
    },
  ],
};
