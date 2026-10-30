// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/organizer_event_offer_audits.schema.json.

const schemaOrganizerEventOfferAuditDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/organizer_event_offer_audits.schema.json',
  'title': 'OrganizerEventOfferAuditDocument',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'offerId',
    'requestId',
    'actorUid',
    'kind',
    'beforeRevision',
    'afterRevision',
    'generation',
    'atMillis',
    'paymentStatus',
    'bankReceiptChecked',
    'reviewNote',
  ],
  'properties': <String, Object?>{
    'offerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'pattern': '^[A-Za-z0-9_-]{1,180}\$',
    },
    'requestId': <String, Object?>{
      'type': 'string',
      'minLength': 8,
      'maxLength': 120,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9_-]{7,119}\$',
    },
    'actorUid': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'pattern': '^[A-Za-z0-9_-]{1,180}\$',
    },
    'kind': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'createDraft',
        'reissueDraft',
        'offer',
        'withdraw',
        'expire',
        'recordEvidence',
        'reconcileEvidence',
      ],
    },
    'beforeRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
    },
    'afterRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
    },
    'generation': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
    },
    'atMillis': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
    },
    'paymentStatus': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'none',
        'evidenceSubmitted',
        'hostAttestedReceived',
        'rejected',
      ],
    },
    'bankReceiptChecked': <String, Object?>{
      'type': 'boolean',
    },
    'reviewNote': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'minLength': 3,
          'maxLength': 240,
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
  },
};
