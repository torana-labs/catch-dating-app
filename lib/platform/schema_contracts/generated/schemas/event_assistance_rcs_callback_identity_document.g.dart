// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/event_assistance_rcs_callback_identities.schema.json.

const schemaEventAssistanceRcsCallbackIdentityDocumentSchema = <String, Object?>{
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'schemaVersion',
    'receiptKey',
    'primaryCallbackId',
    'firstStoredAt',
    'conflictedAt',
  ],
  'properties': <String, Object?>{
    'schemaVersion': <String, Object?>{
      'type': 'integer',
      'const': 1,
    },
    'receiptKey': <String, Object?>{
      'type': 'string',
      'pattern': '^rcs-callback:[a-f0-9]{64}\$',
    },
    'primaryCallbackId': <String, Object?>{
      'type': 'string',
      'pattern': '^rcs-event:[a-f0-9]{64}\$',
    },
    'firstStoredAt': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
    },
    'conflictedAt': <String, Object?>{
      'type': <Object?>[
        'integer',
        'null',
      ],
      'minimum': 0,
      'maximum': 9007199254740991,
    },
  },
  'title': 'EventAssistanceRcsCallbackIdentityDocument',
  'x-firestore-collection': 'eventAssistanceRcsCallbackIdentities',
  'x-firestore-path': 'eventAssistanceRcsCallbackIdentities/{receiptKey}',
  'x-document-id-field': 'receiptKey',
  'x-owner': 'event-assistance authenticated RCS ingress',
};
