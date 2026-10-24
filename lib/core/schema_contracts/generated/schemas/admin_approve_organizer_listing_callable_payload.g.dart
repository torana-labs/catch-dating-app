// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/admin_approve_organizer_listing_payload.schema.json.

const schemaAdminApproveOrganizerListingCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/admin_approve_organizer_listing_payload.schema.json',
  'title': 'AdminApproveOrganizerListingCallablePayload',
  'description': 'Staff approve a listing Supply Intake built from a nomination, an organizer\'s own submission or discovery. One transaction publishes the organizer page claimable and noindex, hidden in the app, records the review decision and receipt, and opens the organizer\'s Sales account, opportunity, tasks and activity.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'requestId',
    'listingWorkItemId',
    'contentHash',
    'name',
    'publicSlug',
    'marketId',
    'organizerType',
    'checklist',
    'note',
  ],
  'properties': <String, Object?>{
    'requestId': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}\$',
      'description': 'The reviewer\'s idempotency key; a retry with the same content replays.',
    },
    'listingWorkItemId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'contentHash': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
      'description': 'The listing content the reviewer saw. A listing rebuilt since then is refused.',
    },
    'name': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 120,
    },
    'publicSlug': <String, Object?>{
      'type': 'string',
      'minLength': 3,
      'maxLength': 64,
      'pattern': '^[a-z0-9](?:[a-z0-9-]{1,62}[a-z0-9])\$',
    },
    'marketId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 120,
      'pattern': '^[a-z]{2}-[a-z0-9]+(?:-[a-z0-9]+)*\$',
    },
    'organizerType': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'club',
        'community',
        'individual',
        'eventProducer',
        'venue',
        'brand',
      ],
      'description': 'Canonical organizer classification. Club is one organizer subtype; missing legacy values normalize to club during migration.',
    },
    'checklist': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'description': 'The public-web publication checklist, every item confirmed.',
      'required': <Object?>[
        'identityReviewed',
        'surfaceInventoryReviewed',
        'ownerSafeCopyReviewed',
        'marketScopeReviewed',
        'mediaRightsReviewed',
        'crawlDisabledReviewed',
        'claimTargetReviewed',
        'takedownPathReviewed',
        'impersonationReviewed',
      ],
      'properties': <String, Object?>{
        'identityReviewed': <String, Object?>{
          'const': true,
        },
        'surfaceInventoryReviewed': <String, Object?>{
          'const': true,
        },
        'ownerSafeCopyReviewed': <String, Object?>{
          'const': true,
        },
        'marketScopeReviewed': <String, Object?>{
          'const': true,
        },
        'mediaRightsReviewed': <String, Object?>{
          'const': true,
        },
        'crawlDisabledReviewed': <String, Object?>{
          'const': true,
        },
        'claimTargetReviewed': <String, Object?>{
          'const': true,
        },
        'takedownPathReviewed': <String, Object?>{
          'const': true,
        },
        'impersonationReviewed': <String, Object?>{
          'const': true,
        },
      },
    },
    'note': <String, Object?>{
      'type': 'string',
      'minLength': 10,
      'maxLength': 500,
    },
  },
  'x-callable-aliases': <Object?>[
    'adminApproveOrganizerListing',
  ],
};
