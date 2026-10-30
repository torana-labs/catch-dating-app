// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/program_guest_group_list_response.schema.json.

const schemaProgramGuestGroupListCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/program_guest_group_list_response.schema.json',
  'title': 'ProgramGuestGroupListCallableResponse',
  'description': 'Coordinator-facing inventory of organizer-defined guest groups for a program, with denormalized member counts.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'programId',
    'groups',
  ],
  'properties': <String, Object?>{
    'programId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'groups': <String, Object?>{
      'type': 'array',
      'maxItems': 500,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'groupId',
          'label',
          'dimension',
          'sortOrder',
          'memberCount',
          'hotelId',
          'revision',
        ],
        'properties': <String, Object?>{
          'groupId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
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
          },
          'sortOrder': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
            'maximum': 10000,
          },
          'memberCount': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
          },
          'hotelId': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
            'minLength': 1,
            'maxLength': 180,
          },
          'revision': <String, Object?>{
            'type': 'integer',
            'minimum': 1,
          },
        },
      },
    },
  },
};
