// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/organizer_moment_sends.schema.json.

const schemaOrganizerMomentSendDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/organizer_moment_sends.schema.json',
  'title': 'OrganizerMomentSendDocument',
  'description': 'Per-recipient send decision for a moment run; document id is {runId}_{recipientKey} so retries never double-send and every suppression carries its audited reason.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'organizerMomentSends',
  'x-firestore-path': 'organizerMomentSends/{sendId}',
  'x-document-id-field': 'sendId',
  'x-owner': 'moment runner',
  'required': <Object?>[
    'momentId',
    'recipientKey',
    'decision',
    'dayKey',
    'createdAtMillis',
  ],
  'properties': <String, Object?>{
    'momentId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'recipientKey': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 220,
      'description': 'Stable recipient idempotency key: household:|guest:|uid:|contact: prefixed.',
    },
    'decision': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'sent',
        'suppressed',
      ],
    },
    'reason': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'enum': <Object?>[
        'noEndpoint',
        'preferenceOff',
        'noConsent',
        'optedOut',
        'endpointSuppressed',
        'dailyCap',
        'deliveryConflict',
        'superseded',
        'expired',
        'programEnded',
        'recipientWithdrawn',
        'permissionRevoked',
        'frequencyCapped',
        'hostReview',
        null,
      ],
      'description': 'Suppression reason; null on sent.',
    },
    'dayKey': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 40,
      'description': 'Scope-local calendar day (YYYY-MM-DD) for per-endpoint daily caps.',
    },
    'createdAtMillis': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
    },
    'runId': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 260,
      'description': 'Run that produced this send; set on staffAttention sends so the attention projection can group recipients per run.',
    },
    'actionKind': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'enum': <Object?>[
        'sendTemplate',
        'push',
        'staffAttention',
        null,
      ],
      'description': 'Moment action kind; staffAttention rows feed the organizer attention projection.',
    },
    'organizerId': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 200,
      'description': 'Owning organizer for attention projection queries.',
    },
    'scopeKind': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'enum': <Object?>[
        'event',
        'program',
        'organizer',
        null,
      ],
    },
    'scopeId': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 200,
    },
    'duty': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 80,
      'description': 'staffAttention: duty the alert targeted.',
    },
    'severity': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'enum': <Object?>[
        'info',
        'warning',
        'urgent',
        null,
      ],
      'description': 'staffAttention: alert severity.',
    },
    'title': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 240,
      'description': 'staffAttention: rendered alert title.',
    },
    'deliveryMessageId': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'pattern': '^outbox:[a-f0-9]{64}\$',
      'description': 'Durable intent record that executed this send (automation/program durable deliveries); the outbox owns the attempt history this row projects.',
    },
    'deliveryState': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'enum': <Object?>[
        'accepted',
        'unknown',
        'delivered',
        'read',
        'failed',
        'revoked',
        'notDispatched',
        null,
      ],
      'description': 'Outbox evidence projected for this recipient. Unknown never implies confirmed delivery. notDispatched is a proven-unsent retry projection; the original run window and authority still apply.',
    },
  },
};
