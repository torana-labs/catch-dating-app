// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/event_assistance_rcs_callback_receipts.schema.json.

const schemaEventRcsCallbackReceiptDocumentSchema = <String, Object?>{
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'schemaVersion',
    'callbackId',
    'callbackHash',
    'processedAt',
    'outcome',
  ],
  'properties': <String, Object?>{
    'schemaVersion': <String, Object?>{
      'type': 'integer',
      'const': 1,
    },
    'callbackId': <String, Object?>{
      'type': 'string',
      'pattern': '^rcs-event:[a-f0-9]{64}\$',
    },
    'callbackHash': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
    'processedAt': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
    },
    'outcome': <String, Object?>{
      'oneOf': <Object?>[
        <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'kind',
            'messageId',
            'attemptId',
            'disposition',
          ],
          'properties': <String, Object?>{
            'kind': <String, Object?>{
              'const': 'delivery',
            },
            'messageId': <String, Object?>{
              'type': 'string',
              'pattern': '^outbox:[a-f0-9]{64}\$',
            },
            'attemptId': <String, Object?>{
              'type': 'string',
              'pattern': '^attempt:[a-f0-9]{64}\$',
            },
            'disposition': <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'applied',
                'duplicateOrOlder',
                'conflictingEvidence',
              ],
            },
          },
        },
        <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'kind',
            'messageId',
            'attemptId',
            'result',
          ],
          'properties': <String, Object?>{
            'kind': <String, Object?>{
              'const': 'reply',
            },
            'messageId': <String, Object?>{
              'type': 'string',
              'pattern': '^outbox:[a-f0-9]{64}\$',
            },
            'attemptId': <String, Object?>{
              'type': 'string',
              'pattern': '^attempt:[a-f0-9]{64}\$',
            },
            'result': <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'accepted',
                'replayed',
              ],
            },
          },
        },
        <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'kind',
            'reason',
          ],
          'properties': <String, Object?>{
            'kind': <String, Object?>{
              'const': 'ignored',
            },
            'reason': <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'subscription',
                'unstructured',
                'guestPage',
                'unknownSuggestion',
                'unconfirmedRevocation',
                'unrelatedMessage',
              ],
            },
          },
        },
        <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'kind',
            'reason',
          ],
          'properties': <String, Object?>{
            'kind': <String, Object?>{
              'const': 'rejected',
            },
            'reason': <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'unavailable',
                'scopeMismatch',
                'staleIntent',
                'invalidChoice',
                'expired',
                'alreadyResponded',
                'noLongerNeeded',
                'factsStale',
                'guestStateChanged',
              ],
            },
          },
        },
      ],
    },
  },
  'title': 'EventRcsCallbackReceiptDocument',
  'x-firestore-collection': 'eventAssistanceRcsCallbackReceipts',
  'x-firestore-path': 'eventAssistanceRcsCallbackReceipts/{callbackId}',
  'x-document-id-field': 'callbackId',
  'x-owner': 'event-service RCS callback consumer',
};
