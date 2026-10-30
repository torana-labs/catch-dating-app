// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/cross_paths_showcase_eligibility.schema.json.

const schemaCrossPathsShowcaseEligibilityDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/cross_paths_showcase_eligibility.schema.json',
  'title': 'CrossPathsShowcaseEligibilityDocument',
  'description': 'Server-only reviewed eligibility record for showing one member in Cross Paths. It stores coarse readiness reasons and a profile fingerprint, never an attractiveness score.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'crossPathsShowcaseEligibility',
  'x-firestore-path': 'crossPathsShowcaseEligibility/{uid}',
  'x-document-id-field': 'uid',
  'x-owner': 'adminSetCrossPathsShowcaseEligibility callable',
  'required': <Object?>[
    'status',
    'reasonCodes',
    'ruleVersion',
    'reviewVersion',
    'profileFingerprint',
    'reviewChecklist',
    'reviewNote',
    'reviewedByUid',
    'reviewedAt',
    'updatedAt',
  ],
  'properties': <String, Object?>{
    'status': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'eligible',
        'needsReview',
        'paused',
      ],
      'x-catch-ownership': 'callable-owned',
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
      'x-catch-ownership': 'callable-owned',
    },
    'ruleVersion': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'x-catch-ownership': 'callable-owned',
    },
    'reviewVersion': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'x-catch-ownership': 'callable-owned',
    },
    'profileFingerprint': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
      'x-catch-ownership': 'callable-owned',
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
      'x-catch-ownership': 'callable-owned',
    },
    'reviewNote': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 1000,
      'x-catch-ownership': 'callable-owned',
    },
    'reviewedByUid': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'x-catch-ownership': 'callable-owned',
    },
    'reviewedAt': <String, Object?>{
      'type': 'object',
      'description': 'Serialized Firestore Timestamp fixture shape.',
      'x-firestore-type': 'timestamp',
      'additionalProperties': false,
      'required': <Object?>[
        '_seconds',
        '_nanoseconds',
      ],
      'properties': <String, Object?>{
        '_seconds': <String, Object?>{
          'type': 'integer',
        },
        '_nanoseconds': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 999999999,
        },
      },
      'x-catch-ownership': 'callable-owned',
    },
    'updatedAt': <String, Object?>{
      'type': 'object',
      'description': 'Serialized Firestore Timestamp fixture shape.',
      'x-firestore-type': 'timestamp',
      'additionalProperties': false,
      'required': <Object?>[
        '_seconds',
        '_nanoseconds',
      ],
      'properties': <String, Object?>{
        '_seconds': <String, Object?>{
          'type': 'integer',
        },
        '_nanoseconds': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 999999999,
        },
      },
      'x-catch-ownership': 'callable-owned',
    },
  },
};
