// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/program_staff_invites.schema.json.

const schemaProgramStaffInviteDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/program_staff_invites.schema.json',
  'title': 'ProgramStaffInviteDocument',
  'description': 'Server-owned single-use staff invite bound to a phone number. Redeeming the invite requires a signed-in account whose verified phone matches; redemption materializes a programStaffGrants document.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'programStaffInvites',
  'x-firestore-path': 'programStaffInvites/{inviteId}',
  'x-document-id-field': 'inviteId',
  'x-owner': 'program staff invite callables',
  'required': <Object?>[
    'organizerId',
    'programId',
    'phoneE164',
    'displayName',
    'duties',
    'status',
    'createdBy',
    'createdAt',
    'expiresAt',
    'claimedByUid',
    'claimedAt',
    'revokedBy',
    'revokedAt',
    'updatedAt',
    'revision',
  ],
  'properties': <String, Object?>{
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'programId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'phoneE164': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'minLength': 4,
          'maxLength': 32,
          'description': 'Normalized E.164 phone the invite is bound to. Only a verified auth token carrying this number may claim the invite. Null after archive anonymization.',
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'displayName': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 120,
          'description': 'Null after archive anonymization.',
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'duties': <String, Object?>{
      'type': 'array',
      'minItems': 1,
      'maxItems': 8,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'duty',
          'pickupPointIds',
          'hotelIds',
        ],
        'properties': <String, Object?>{
          'duty': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'programAdmin',
              'programCoordinator',
              'guestRelations',
              'communications',
              'functionCheckIn',
              'functionLead',
              'airportGreeter',
              'hotelDesk',
              'transportDispatcher',
              'reconciliationViewer',
              'stakeholderViewer',
            ],
          },
          'pickupPointIds': <String, Object?>{
            'type': 'array',
            'maxItems': 32,
            'uniqueItems': true,
            'items': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 180,
            },
            'description': 'Pickup restriction; empty means all program pickup points. Both resource restrictions must be met by the same assignment.',
          },
          'hotelIds': <String, Object?>{
            'type': 'array',
            'maxItems': 64,
            'uniqueItems': true,
            'items': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 180,
            },
            'description': 'Destination restriction; empty means all program hotels. Restrictions from different assignments never combine into new routes.',
          },
          'functionIds': <String, Object?>{
            'type': 'array',
            'maxItems': 64,
            'uniqueItems': true,
            'items': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 180,
            },
            'description': 'Function restriction for functionCheckIn and functionLead duties; absent or empty means all program functions. Optional on documents written before function-scoped duties existed.',
          },
        },
      },
    },
    'status': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'pending',
        'claimed',
        'revoked',
      ],
    },
    'createdBy': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'createdAt': <String, Object?>{
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
    'expiresAt': <String, Object?>{
      'type': 'object',
      'description': 'Invite redemption deadline. The resulting grant uses its own expiry.',
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
    'claimedByUid': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 1,
      'maxLength': 180,
    },
    'claimedAt': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
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
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'revokedBy': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 1,
      'maxLength': 180,
    },
    'revokedAt': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
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
        <String, Object?>{
          'type': 'null',
        },
      ],
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
    'revision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
    },
    'anonymizedAt': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
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
        <String, Object?>{
          'type': 'null',
        },
      ],
      'description': 'Identity/free-text scrub marker set by the archive retention sweep; null until anonymized.',
    },
    'programAuthorization': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'description': 'Server-owned proof that this exact program owner approved access, directly or through a current programAdmin. The inherited deadline bounds every delegated renewal. Optional only for legacy creator-issued records.',
      'required': <Object?>[
        'ownerUid',
        'approvedByUid',
        'approvedAtMillis',
        'authorizedUntilMillis',
      ],
      'properties': <String, Object?>{
        'ownerUid': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        'approvedByUid': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        'approvedAtMillis': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
          'maximum': 9007199254740991,
        },
        'authorizedUntilMillis': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
          'maximum': 9007199254740991,
        },
      },
    },
  },
};
