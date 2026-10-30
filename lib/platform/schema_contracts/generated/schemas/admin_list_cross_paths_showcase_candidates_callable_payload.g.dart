// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/admin_list_cross_paths_showcase_candidates_payload.schema.json.

const schemaAdminListCrossPathsShowcaseCandidatesCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/admin_list_cross_paths_showcase_candidates_payload.schema.json',
  'title': 'AdminListCrossPathsShowcaseCandidatesCallablePayload',
  'description': 'Callable payload for a bounded, role-gated Cross Paths showcase review queue.',
  'type': 'object',
  'additionalProperties': false,
  'properties': <String, Object?>{
    'uid': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'status': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'enum': <Object?>[
        'all',
        'eligible',
        'needsReview',
        'paused',
        null,
      ],
    },
    'marketId': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 120,
          'pattern': '^[a-z]{2}-[a-z0-9]+(?:-[a-z0-9]+)*\$',
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'cursor': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'limit': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 50,
    },
  },
};
