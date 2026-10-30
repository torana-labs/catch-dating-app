// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from embedded/event_offer_action.schema.json.

const schemaEventOfferActionSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/embedded/event_offer_action.schema.json',
  'title': 'EventOfferAction',
  'oneOf': <Object?>[
    <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'requestId',
        'expectedRevision',
        'kind',
        'terms',
      ],
      'properties': <String, Object?>{
        'requestId': <String, Object?>{
          'type': 'string',
          'minLength': 8,
          'maxLength': 100,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9_-]{7,99}\$',
        },
        'expectedRevision': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 9007199254740991,
        },
        'kind': <String, Object?>{
          'const': 'createDraft',
          'type': 'string',
        },
        'terms': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'expiresAtMillis',
            'organizerPaymentLink',
          ],
          'properties': <String, Object?>{
            'expiresAtMillis': <String, Object?>{
              'type': 'integer',
              'minimum': 1,
              'maximum': 9007199254740991,
            },
            'organizerPaymentLink': <String, Object?>{
              'anyOf': <Object?>[
                <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 2048,
                  'format': 'uri',
                  'pattern': '^https://',
                },
                <String, Object?>{
                  'type': 'null',
                },
              ],
            },
          },
        },
      },
    },
    <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'requestId',
        'expectedRevision',
        'kind',
        'expectedGeneration',
        'terms',
      ],
      'properties': <String, Object?>{
        'requestId': <String, Object?>{
          'type': 'string',
          'minLength': 8,
          'maxLength': 100,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9_-]{7,99}\$',
        },
        'expectedRevision': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 9007199254740991,
        },
        'kind': <String, Object?>{
          'const': 'reissueDraft',
          'type': 'string',
        },
        'expectedGeneration': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
          'maximum': 9007199254740991,
        },
        'terms': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'expiresAtMillis',
            'organizerPaymentLink',
          ],
          'properties': <String, Object?>{
            'expiresAtMillis': <String, Object?>{
              'type': 'integer',
              'minimum': 1,
              'maximum': 9007199254740991,
            },
            'organizerPaymentLink': <String, Object?>{
              'anyOf': <Object?>[
                <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 2048,
                  'format': 'uri',
                  'pattern': '^https://',
                },
                <String, Object?>{
                  'type': 'null',
                },
              ],
            },
          },
        },
      },
    },
    <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'requestId',
        'expectedRevision',
        'kind',
        'expectedGeneration',
      ],
      'properties': <String, Object?>{
        'requestId': <String, Object?>{
          'type': 'string',
          'minLength': 8,
          'maxLength': 100,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9_-]{7,99}\$',
        },
        'expectedRevision': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 9007199254740991,
        },
        'kind': <String, Object?>{
          'const': 'offer',
          'type': 'string',
        },
        'expectedGeneration': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
          'maximum': 9007199254740991,
        },
      },
    },
    <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'requestId',
        'expectedRevision',
        'kind',
        'expectedGeneration',
      ],
      'properties': <String, Object?>{
        'requestId': <String, Object?>{
          'type': 'string',
          'minLength': 8,
          'maxLength': 100,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9_-]{7,99}\$',
        },
        'expectedRevision': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 9007199254740991,
        },
        'kind': <String, Object?>{
          'const': 'withdraw',
          'type': 'string',
        },
        'expectedGeneration': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
          'maximum': 9007199254740991,
        },
      },
    },
    <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'requestId',
        'expectedRevision',
        'kind',
        'expectedGeneration',
      ],
      'properties': <String, Object?>{
        'requestId': <String, Object?>{
          'type': 'string',
          'minLength': 8,
          'maxLength': 100,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9_-]{7,99}\$',
        },
        'expectedRevision': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 9007199254740991,
        },
        'kind': <String, Object?>{
          'const': 'expire',
          'type': 'string',
        },
        'expectedGeneration': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
          'maximum': 9007199254740991,
        },
      },
    },
    <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'requestId',
        'expectedRevision',
        'kind',
        'expectedGeneration',
        'evidenceReference',
      ],
      'properties': <String, Object?>{
        'requestId': <String, Object?>{
          'type': 'string',
          'minLength': 8,
          'maxLength': 100,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9_-]{7,99}\$',
        },
        'expectedRevision': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 9007199254740991,
        },
        'kind': <String, Object?>{
          'const': 'recordEvidence',
          'type': 'string',
        },
        'expectedGeneration': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
          'maximum': 9007199254740991,
        },
        'evidenceReference': <String, Object?>{
          'type': 'string',
          'minLength': 3,
          'maxLength': 240,
        },
      },
    },
    <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'requestId',
        'expectedRevision',
        'kind',
        'expectedGeneration',
        'decision',
        'reviewNote',
        'bankReceiptChecked',
      ],
      'properties': <String, Object?>{
        'requestId': <String, Object?>{
          'type': 'string',
          'minLength': 8,
          'maxLength': 100,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9_-]{7,99}\$',
        },
        'expectedRevision': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 9007199254740991,
        },
        'kind': <String, Object?>{
          'const': 'reconcileEvidence',
          'type': 'string',
        },
        'expectedGeneration': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
          'maximum': 9007199254740991,
        },
        'decision': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'hostAttestedReceived',
            'rejected',
          ],
        },
        'reviewNote': <String, Object?>{
          'type': 'string',
          'minLength': 3,
          'maxLength': 240,
        },
        'bankReceiptChecked': <String, Object?>{
          'type': 'boolean',
        },
      },
    },
  ],
};
