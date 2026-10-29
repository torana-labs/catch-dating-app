// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/organizer_claim_instagram_messages.schema.json.

const schemaOrganizerClaimInstagramMessageDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/organizer_claim_instagram_messages.schema.json',
  'title': 'OrganizerClaimInstagramMessageDocument',
  'description': 'Server-only receipt for one Instagram direct message the claim webhook handled, stored at organizerClaimInstagramMessages/{messageKey}. Meta retries deliveries, so the receipt makes each message count once. It keeps no message text or sender id. Firestore TTL deletes it after expiresAt.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'organizerClaimInstagramMessages',
  'x-firestore-path': 'organizerClaimInstagramMessages/{messageKey}',
  'x-document-id-field': 'messageKey',
  'x-owner': 'instagramClaimWebhook',
  'required': <Object?>[
    'messageKey',
    'outcome',
    'attemptId',
    'receivedAt',
    'expiresAt',
  ],
  'properties': <String, Object?>{
    'messageKey': <String, Object?>{
      'description': 'SHA-256 of the Instagram message id.',
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
      'x-catch-ownership': 'server-only',
    },
    'outcome': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'verified',
        'wrongSender',
        'expiredCode',
        'codeAlreadyUsed',
        'unknownCode',
        'claimUnavailable',
        'senderUnknown',
        'rateLimited',
      ],
      'x-catch-ownership': 'server-only',
    },
    'attemptId': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
      'x-catch-ownership': 'server-only',
    },
    'receivedAt': <String, Object?>{
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
      'x-catch-ownership': 'server-only',
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
      'x-catch-ownership': 'server-only',
    },
  },
};
