// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/private_seat_reconciliation_response.schema.json.

const schemaPrivateSeatReconciliationCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/private_seat_reconciliation_response.schema.json',
  'title': 'PrivateSeatReconciliationCallableResponse',
  'oneOf': <Object?>[
    <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'kind',
        'progress',
      ],
      'properties': <String, Object?>{
        'kind': <String, Object?>{
          'type': 'string',
          'const': 'progress',
        },
        'progress': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'eventId',
            'migrationRevision',
            'phase',
            'scannedRows',
            'appliedRows',
            'outputRows',
            'occupied',
          ],
          'properties': <String, Object?>{
            'eventId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 180,
            },
            'migrationRevision': <String, Object?>{
              'type': 'integer',
              'minimum': 1,
            },
            'phase': <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'scan',
                'plan',
                'apply',
                'cleanup',
                'discard',
              ],
            },
            'scannedRows': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 750,
            },
            'appliedRows': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 1500,
            },
            'outputRows': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 1500,
            },
            'occupied': <String, Object?>{
              'type': 'null',
            },
          },
        },
      },
    },
    <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'kind',
        'receipt',
      ],
      'properties': <String, Object?>{
        'kind': <String, Object?>{
          'type': 'string',
          'const': 'complete',
        },
        'receipt': <String, Object?>{
          'title': 'PrivateEventSetupMutationCallableResponse',
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'eventId',
            'setupRevision',
            'replayed',
          ],
          'properties': <String, Object?>{
            'eventId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 180,
            },
            'setupRevision': <String, Object?>{
              'type': 'integer',
              'minimum': 1,
            },
            'replayed': <String, Object?>{
              'type': 'boolean',
            },
          },
        },
      },
    },
    <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'kind',
        'eventId',
        'requestId',
      ],
      'properties': <String, Object?>{
        'kind': <String, Object?>{
          'type': 'string',
          'const': 'discarded',
        },
        'eventId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        'requestId': <String, Object?>{
          'type': 'string',
          'pattern': '^[A-Za-z0-9][A-Za-z0-9_-]{7,127}\$',
        },
      },
    },
  ],
};
