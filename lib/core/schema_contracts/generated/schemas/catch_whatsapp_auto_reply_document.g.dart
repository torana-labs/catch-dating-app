// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/catch_whatsapp_auto_replies.schema.json.

const schemaCatchWhatsappAutoReplyDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/catch_whatsapp_auto_replies.schema.json',
  'title': 'CatchWhatsappAutoReplyDocument',
  'description': 'One automatic reply from Catch\'s WhatsApp number to someone who just messaged it, claimed before sending so a redelivered message never sends twice. Keeps no message text, only which reply it was, the inbound receipt it answers, the sender\'s endpoint hash and the outcome. An uncertain send stays consumed. Expires after 30 days.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'catchWhatsappAutoReplies',
  'x-firestore-path': 'catchWhatsappAutoReplies/{replyId}',
  'x-document-id-field': 'replyId',
  'x-owner': 'Catch WhatsApp inbound router',
  'required': <Object?>[
    'schemaVersion',
    'replyId',
    'kind',
    'sourceEventId',
    'endpointHash',
    'state',
    'providerMessageId',
    'createdAtMillis',
    'updatedAtMillis',
    'expiresAt',
  ],
  'properties': <String, Object?>{
    'schemaVersion': <String, Object?>{
      'const': 1,
    },
    'replyId': <String, Object?>{
      'type': 'string',
      'pattern': '^cwauto_[a-f0-9]{64}\$',
    },
    'kind': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'nomination_queued',
        'nomination_without_links',
        'nomination_rate_limited',
        'clarification_question',
        'support_acknowledged',
        'listing_ready',
      ],
    },
    'sourceEventId': <String, Object?>{
      'type': 'string',
      'pattern': '^cwhe_[a-f0-9]{64}\$',
    },
    'endpointHash': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
    'state': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'claimed',
        'sent',
        'unknown',
        'skipped_stop',
        'skipped_unavailable',
      ],
    },
    'providerMessageId': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 1,
      'maxLength': 240,
    },
    'createdAtMillis': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
    },
    'updatedAtMillis': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
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
      'x-firestore-ttl': true,
    },
  },
};
