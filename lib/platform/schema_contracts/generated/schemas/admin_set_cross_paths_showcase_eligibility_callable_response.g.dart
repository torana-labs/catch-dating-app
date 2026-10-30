// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/admin_set_cross_paths_showcase_eligibility_response.schema.json.

const schemaAdminSetCrossPathsShowcaseEligibilityCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/admin_set_cross_paths_showcase_eligibility_response.schema.json',
  'title': 'AdminSetCrossPathsShowcaseEligibilityCallableResponse',
  'description': 'Validated result of one audited Cross Paths showcase eligibility decision.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'uid',
    'status',
    'reasonCodes',
    'profileFingerprint',
    'ruleVersion',
    'reviewVersion',
    'reviewedAt',
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
    'reasonCodes': <String, Object?>{
      'type': 'array',
      'maxItems': 12,
      'uniqueItems': true,
      'items': <String, Object?>{
        'type': 'string',
        'enum': <Object?>[
          'insufficient_photos',
          'incomplete_prompts',
          'missing_relationship_goal',
          'broken_media',
          'photo_moderation_pending',
          'photo_moderation_rejected',
          'public_profile_missing',
          'profile_changed',
          'reviewer_hold',
          'manual_pause',
        ],
      },
    },
    'profileFingerprint': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
    'ruleVersion': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
    },
    'reviewVersion': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
    },
    'reviewedAt': <String, Object?>{
      'type': 'string',
      'format': 'date-time',
    },
  },
};
