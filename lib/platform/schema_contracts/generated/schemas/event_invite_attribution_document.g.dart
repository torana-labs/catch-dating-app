// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/event_invite_attributions.schema.json.

const schemaEventInviteAttributionDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/event_invite_attributions.schema.json',
  'title': 'EventInviteAttributionDocument',
  'description': 'Immutable evidence assigning or reversing one downstream event fact to one invitation link.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'eventInviteAttributions',
  'x-firestore-path': 'eventInviteAttributions/{attributionId}',
  'x-document-id-field': 'attributionId',
  'x-owner': 'event participation and operational attendee attribution triggers',
  'required': <Object?>[
    'eventId',
    'organizerId',
    'inviteLinkId',
    'linkKind',
    'ownerContactId',
    'intendedRecipientContactId',
    'subjectContactId',
    'subjectUid',
    'factKind',
    'operation',
    'sourceKind',
    'sourceFactId',
    'primaryCredit',
    'confidence',
    'referralCredit',
    'reversalOfAttributionId',
    'occurredAt',
    'createdAt',
  ],
  'properties': <String, Object?>{
    'eventId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'inviteLinkId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'linkKind': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'hostChannel',
        'directRecipient',
        'attendeeReferrer',
        'promoter',
        'partner',
      ],
    },
    'ownerContactId': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 1,
      'maxLength': 180,
    },
    'intendedRecipientContactId': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 1,
      'maxLength': 180,
    },
    'subjectContactId': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 1,
      'maxLength': 180,
    },
    'subjectUid': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 1,
      'maxLength': 180,
    },
    'factKind': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'registration',
        'booking',
        'checkIn',
        'revenue',
        'refund',
      ],
    },
    'operation': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'credit',
        'reversal',
      ],
    },
    'sourceKind': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'catchParticipation',
        'eventAttendee',
        'provider',
        'selfReport',
      ],
    },
    'sourceFactId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 240,
    },
    'primaryCredit': <String, Object?>{
      'type': 'boolean',
    },
    'confidence': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'exact',
        'reconciled',
        'selfReported',
      ],
    },
    'referralCredit': <String, Object?>{
      'type': 'boolean',
    },
    'amountMinor': <String, Object?>{
      'type': <Object?>[
        'integer',
        'null',
      ],
      'minimum': 0,
    },
    'currency': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'pattern': '^[A-Z]{3}\$',
    },
    'reversalOfAttributionId': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 1,
      'maxLength': 180,
    },
    'occurredAt': <String, Object?>{
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
  },
};
