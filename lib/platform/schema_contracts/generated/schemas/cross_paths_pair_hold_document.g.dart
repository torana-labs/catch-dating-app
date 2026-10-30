// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/cross_paths_pair_holds.schema.json.

const schemaCrossPathsPairHoldDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/cross_paths_pair_holds.schema.json',
  'title': 'CrossPathsPairHoldDocument',
  'description': 'Server-owned, short-lived companion-seat reservation for an accepted Cross Paths invitation.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'cross_paths_pair_holds',
  'x-firestore-path': 'crossPathsPairHolds/{holdId}',
  'x-document-id-field': 'id',
  'x-owner': 'Cross Paths pair-inventory callables and payment fulfillment',
  'required': <Object?>[
    'eventId',
    'invitationId',
    'organizerId',
    'requesterUid',
    'attendeeUid',
    'participantIds',
    'status',
    'requesterBookingStatus',
    'attendeeBookingStatus',
    'requesterCohortId',
    'attendeeCohortId',
    'requesterPriceInPaise',
    'attendeePriceInPaise',
    'currency',
    'createdAt',
    'updatedAt',
    'expiresAt',
    'confirmedAt',
    'releasedAt',
    'releaseReason',
    'paymentId',
    'conversationId',
  ],
  'properties': <String, Object?>{
    'eventId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'x-catch-ownership': 'callable-owned',
    },
    'invitationId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'x-catch-ownership': 'callable-owned',
    },
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'x-catch-ownership': 'callable-owned',
    },
    'requesterUid': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'x-catch-ownership': 'callable-owned',
    },
    'attendeeUid': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'x-catch-ownership': 'callable-owned',
    },
    'participantIds': <String, Object?>{
      'type': 'array',
      'minItems': 2,
      'maxItems': 2,
      'uniqueItems': true,
      'items': <String, Object?>{
        'type': 'string',
        'minLength': 1,
        'maxLength': 180,
      },
      'x-catch-ownership': 'callable-owned',
    },
    'status': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'active',
        'confirmed',
        'expired',
        'cancelled',
        'invalidated',
      ],
      'x-catch-ownership': 'callable-owned',
    },
    'requesterBookingStatus': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'held',
        'confirmed',
        'cancelled',
      ],
      'x-catch-ownership': 'callable-owned',
    },
    'attendeeBookingStatus': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'confirmed',
        'cancelled',
      ],
      'x-catch-ownership': 'callable-owned',
    },
    'requesterCohortId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 120,
      'x-catch-ownership': 'callable-owned',
    },
    'attendeeCohortId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 120,
      'x-catch-ownership': 'callable-owned',
    },
    'requesterPriceInPaise': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 100000000,
      'x-catch-ownership': 'callable-owned',
    },
    'attendeePriceInPaise': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 100000000,
      'x-catch-ownership': 'callable-owned',
    },
    'currency': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Z]{3}\$',
      'x-catch-ownership': 'callable-owned',
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
    'expiresAt': <String, Object?>{
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
    'confirmedAt': <String, Object?>{
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
      'x-catch-ownership': 'callable-owned',
    },
    'releasedAt': <String, Object?>{
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
      'x-catch-ownership': 'callable-owned',
    },
    'releaseReason': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'enum': <Object?>[
        null,
        'expired',
        'cancelled',
        'event_unavailable',
        'participation_cancelled',
        'safety_state_changed',
        'payment_failed',
      ],
      'x-catch-ownership': 'callable-owned',
    },
    'paymentId': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 1,
      'maxLength': 180,
      'x-catch-ownership': 'callable-owned',
    },
    'conversationId': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 1,
      'maxLength': 180,
      'x-catch-ownership': 'callable-owned',
    },
  },
};
