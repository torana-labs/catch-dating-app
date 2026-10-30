// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/organizer_intake_review_decisions.schema.json.

const schemaOrganizerIntakeReviewDecisionDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/organizer_intake_review_decisions.schema.json',
  'title': 'OrganizerIntakeReviewDecisionDocument',
  'description': 'Latest admin review decision stored at organizerIntakeReviewDecisions/{entityId}. Candidate evidence remains in operationRuns and operationWorkItems.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'organizerIntakeReviewDecisions',
  'x-firestore-path': 'organizerIntakeReviewDecisions/{entityId}',
  'x-document-id-field': 'entityId',
  'x-owner': 'adminDecideOrganizerIntake callable',
  'required': <Object?>[
    'schemaVersion',
    'entityId',
    'decision',
    'decisionStatus',
    'publishStatus',
    'indexStatus',
    'appVisibility',
    'checklist',
    'note',
    'reviewedByUid',
    'reviewedAt',
    'updatedAt',
    'projectionState',
  ],
  'properties': <String, Object?>{
    'schemaVersion': <String, Object?>{
      'type': 'integer',
      'const': 1,
    },
    'entityId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'decision': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'approve_public',
        'hold',
        'suppress',
      ],
    },
    'decisionStatus': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'approved_public',
        'held',
        'suppressed',
      ],
    },
    'publishStatus': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'draft',
        'published',
        'suppressed',
      ],
    },
    'indexStatus': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'noindex',
        'indexed',
      ],
    },
    'appVisibility': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'hidden',
        'discoverable',
      ],
    },
    'checklist': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'identityReviewed',
        'surfaceInventoryReviewed',
        'ownerSafeCopyReviewed',
        'marketScopeReviewed',
        'mediaRightsReviewed',
        'crawlDisabledReviewed',
      ],
      'properties': <String, Object?>{
        'identityReviewed': <String, Object?>{
          'type': 'boolean',
        },
        'surfaceInventoryReviewed': <String, Object?>{
          'type': 'boolean',
        },
        'ownerSafeCopyReviewed': <String, Object?>{
          'type': 'boolean',
        },
        'marketScopeReviewed': <String, Object?>{
          'type': 'boolean',
        },
        'mediaRightsReviewed': <String, Object?>{
          'type': 'boolean',
        },
        'crawlDisabledReviewed': <String, Object?>{
          'type': 'boolean',
        },
        'manualReportsReviewed': <String, Object?>{
          'type': 'boolean',
          'description': 'True when the reviewer explicitly inspected manual reports that have no stored source artifact. Projection replay decides when this acknowledgement is required.',
        },
        'claimTargetReviewed': <String, Object?>{
          'type': 'boolean',
        },
        'takedownPathReviewed': <String, Object?>{
          'type': 'boolean',
        },
        'impersonationReviewed': <String, Object?>{
          'type': 'boolean',
        },
        'operatingStatusReviewed': <String, Object?>{
          'type': 'boolean',
        },
        'eventAccuracyReviewed': <String, Object?>{
          'type': 'boolean',
        },
        'unclaimedAffordancesReviewed': <String, Object?>{
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
    'projectionState': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'pending_static_generation',
        'not_projectable',
      ],
    },
  },
};
