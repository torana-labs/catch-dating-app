// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/form_communication_consent_intents.schema.json.

const schemaFormCommunicationConsentIntentDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/form_communication_consent_intents.schema.json',
  'title': 'FormCommunicationConsentIntentDocument',
  'description': 'Private, immutable form choice. Never read as dispatch permission; promotion requires response ownership and verified control of the exact endpoint.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'organizerId',
    'formId',
    'versionId',
    'responseId',
    'endpointE164',
    'termsVersion',
    'decisions',
    'createdAt',
  ],
  'properties': <String, Object?>{
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'formId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'versionId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'responseId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'endpointE164': <String, Object?>{
      'type': 'string',
      'pattern': '^\\+[1-9][0-9]{6,14}\$',
    },
    'termsVersion': <String, Object?>{
      'const': 'form-whatsapp-v2',
    },
    'decisions': <String, Object?>{
      'type': 'array',
      'minItems': 1,
      'maxItems': 3,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'principal',
          'purpose',
          'copyHash',
          'decidedAt',
        ],
        'properties': <String, Object?>{
          'principal': <String, Object?>{
            'enum': <Object?>[
              'organizer',
              'catch',
            ],
          },
          'purpose': <String, Object?>{
            'enum': <Object?>[
              'eventOperations',
              'marketing',
            ],
          },
          'copyHash': <String, Object?>{
            'type': 'string',
            'pattern': '^[a-f0-9]{64}\$',
          },
          'decidedAt': <String, Object?>{
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
  'x-firestore-collection': 'formCommunicationConsentIntents',
  'x-firestore-path': 'formCommunicationConsentIntents/{responseId}',
  'x-document-id-field': 'responseId',
  'x-owner': 'organizer form respondent callables',
};
