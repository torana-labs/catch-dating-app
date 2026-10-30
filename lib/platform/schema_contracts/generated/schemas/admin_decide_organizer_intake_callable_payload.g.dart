// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/admin_decide_organizer_intake_payload.schema.json.

const schemaAdminDecideOrganizerIntakeCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/admin_decide_organizer_intake_payload.schema.json',
  'title': 'AdminDecideOrganizerIntakeCallablePayload',
  'description': 'Callable payload accepted by adminDecideOrganizerIntake. This records a manual admin review decision for a private organizer-intake candidate.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'entityId',
    'decision',
    'publishStatus',
    'indexStatus',
    'appVisibility',
    'checklist',
    'note',
  ],
  'properties': <String, Object?>{
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
    'publishStatus': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'draft',
        'published',
        'suppressed',
      ],
      'description': 'Explicit public-web publication switch. Approval does not imply publication.',
    },
    'indexStatus': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'noindex',
        'indexed',
      ],
      'description': 'Explicit search-indexing switch. Indexed requires a published web page.',
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
          'description': 'True when the reviewer explicitly inspected manual reports that have no local raw artifact. Raw evidence remains outside Firestore; replay validation decides when this acknowledgement is required.',
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
  },
};
