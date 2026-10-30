// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/organizer_policy_gap_review_decisions.schema.json.

const schemaOrganizerPolicyGapReviewDecisionDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/organizer_policy_gap_review_decisions.schema.json',
  'title': 'OrganizerPolicyGapReviewDecisionDocument',
  'description': 'Latest admin/product policy-gap review decision stored at organizerPolicyGapReviewDecisions/{decisionId}. These decisions are review state only and do not enable organizer crawls, provider lookups, event imports, defaults, or naming migrations.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'organizerPolicyGapReviewDecisions',
  'x-firestore-path': 'organizerPolicyGapReviewDecisions/{decisionId}',
  'x-document-id-field': 'decisionId',
  'x-owner': 'adminDecideOrganizerPolicyGap callable',
  'required': <Object?>[
    'schemaVersion',
    'decisionId',
    'gapId',
    'decision',
    'decisionStatus',
    'requiredInputsReviewed',
    'checklist',
    'note',
    'reviewedByUid',
    'reviewedAt',
    'updatedAt',
    'operationalState',
  ],
  'properties': <String, Object?>{
    'schemaVersion': <String, Object?>{
      'type': 'integer',
      'const': 1,
    },
    'decisionId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'gapId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 160,
    },
    'decision': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'accept',
        'hold',
        'reject',
      ],
    },
    'decisionStatus': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'accepted',
        'held',
        'rejected',
      ],
    },
    'requiredInputsReviewed': <String, Object?>{
      'type': 'array',
      'maxItems': 20,
      'items': <String, Object?>{
        'type': 'string',
        'minLength': 1,
        'maxLength': 240,
      },
      'uniqueItems': true,
    },
    'checklist': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'requiredInputsReviewed',
        'costAndSafetyReviewed',
        'implementationOwnerReviewed',
        'behaviorStillDisabledAcknowledged',
      ],
      'properties': <String, Object?>{
        'requiredInputsReviewed': <String, Object?>{
          'type': 'boolean',
        },
        'costAndSafetyReviewed': <String, Object?>{
          'type': 'boolean',
        },
        'implementationOwnerReviewed': <String, Object?>{
          'type': 'boolean',
        },
        'behaviorStillDisabledAcknowledged': <String, Object?>{
          'type': 'boolean',
        },
      },
    },
    'note': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 1000,
    },
    'reviewedByUid': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
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
    },
    'operationalState': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'blocked_until_policy_encoded',
        'not_approved',
      ],
    },
  },
};
