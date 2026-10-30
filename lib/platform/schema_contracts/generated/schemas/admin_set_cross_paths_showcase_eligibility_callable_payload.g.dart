// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/admin_set_cross_paths_showcase_eligibility_payload.schema.json.

const schemaAdminSetCrossPathsShowcaseEligibilityCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/admin_set_cross_paths_showcase_eligibility_payload.schema.json',
  'title': 'AdminSetCrossPathsShowcaseEligibilityCallablePayload',
  'description': 'Callable payload for an audited human Cross Paths showcase eligibility decision.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'uid',
    'status',
    'reviewChecklist',
    'reviewNote',
  ],
  'properties': <String, Object?>{
    'uid': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'status': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'eligible',
        'needsReview',
        'paused',
      ],
    },
    'reviewChecklist': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'primaryPortraitClear',
        'profileRepresentsCurrentMember',
        'showcasePolicyReviewed',
      ],
      'properties': <String, Object?>{
        'primaryPortraitClear': <String, Object?>{
          'type': 'boolean',
        },
        'profileRepresentsCurrentMember': <String, Object?>{
          'type': 'boolean',
        },
        'showcasePolicyReviewed': <String, Object?>{
          'type': 'boolean',
        },
      },
    },
    'reviewNote': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 1000,
    },
  },
};
