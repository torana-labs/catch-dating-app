// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/external_event_publication_receipts.schema.json.

const schemaExternalEventPublicationReceiptDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/external_event_publication_receipts.schema.json',
  'title': 'ExternalEventPublicationReceiptDocument',
  'description': 'Immutable idempotency and audit receipt for a dry-run or applied external-event publication/takedown action.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'externalEventPublicationReceipts',
  'x-firestore-path': 'externalEventPublicationReceipts/{receiptId}',
  'x-document-id-field': 'receiptId',
  'x-owner': 'adminPublishListingEvents and adminTakedownExternalEvent callables and the onSupplyIntakeListingApproved trigger',
  'required': <Object?>[
    'schemaVersion',
    'receiptId',
    'idempotencyKey',
    'inputHash',
    'action',
    'executionMode',
    'outcome',
    'eventId',
    'targetPath',
    'sourceActionId',
    'externalLinkCount',
    'reviewNote',
    'actorUid',
    'createdAt',
  ],
  'properties': <String, Object?>{
    'schemaVersion': <String, Object?>{
      'type': 'integer',
      'const': 1,
    },
    'receiptId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'idempotencyKey': <String, Object?>{
      'type': 'string',
      'minLength': 8,
      'maxLength': 180,
    },
    'inputHash': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
    'action': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'publish',
        'takedown',
      ],
    },
    'executionMode': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'dry_run',
        'apply',
      ],
    },
    'outcome': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'would_publish',
        'published',
        'would_remove',
        'removed',
      ],
    },
    'eventId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'targetPath': <String, Object?>{
      'type': 'string',
      'pattern': '^externalEvents/[A-Za-z0-9_-]{1,180}\$',
    },
    'sourceActionId': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 240,
    },
    'externalLinkCount': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 12,
    },
    'reviewNote': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 1000,
    },
    'actorUid': <String, Object?>{
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
  },
};
