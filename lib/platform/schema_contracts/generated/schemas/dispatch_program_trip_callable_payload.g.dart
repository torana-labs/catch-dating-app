// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/dispatch_program_trip_payload.schema.json.

const schemaDispatchProgramTripCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/dispatch_program_trip_payload.schema.json',
  'title': 'DispatchProgramTripCallablePayload',
  'description': 'Dispatch a vehicle: snapshot plate, vendor, class and manifest in one transaction that also writes per-leg active assignments and an idempotency receipt.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'programId',
    'pickupPointId',
    'vehicleClassId',
    'plateDisplay',
    'legIds',
    'clientOperationId',
    'expectedLegRevisions',
  ],
  'properties': <String, Object?>{
    'programId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'pickupPointId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'destinationHotelId': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 1,
      'maxLength': 180,
    },
    'destinationLabel': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 140,
    },
    'vehicleClassId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 60,
    },
    'plateDisplay': <String, Object?>{
      'type': 'string',
      'minLength': 4,
      'maxLength': 16,
    },
    'vendorId': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 1,
      'maxLength': 180,
    },
    'kind': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'guestTransfer',
        'repositioning',
      ],
    },
    'legIds': <String, Object?>{
      'type': 'array',
      'minItems': 1,
      'maxItems': 50,
      'uniqueItems': true,
      'items': <String, Object?>{
        'type': 'string',
        'minLength': 1,
        'maxLength': 180,
      },
    },
    'expectedLegRevisions': <String, Object?>{
      'type': 'array',
      'maxItems': 50,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'legId',
          'revision',
        ],
        'properties': <String, Object?>{
          'legId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
          },
          'revision': <String, Object?>{
            'type': 'integer',
            'minimum': 1,
            'maximum': 9007199254740991,
          },
          'afterObservation': <String, Object?>{
            'type': 'object',
            'additionalProperties': false,
            'required': <Object?>[
              'clientOperationId',
              'action',
            ],
            'description': 'A preceding observation by the same actor on the same journey. Its receipt result revision must still equal the current leg revision.',
            'properties': <String, Object?>{
              'clientOperationId': <String, Object?>{
                'type': 'string',
                'minLength': 8,
                'maxLength': 120,
              },
              'action': <String, Object?>{
                'type': 'string',
                'enum': <Object?>[
                  'claim',
                  'unclaim',
                  'markReady',
                  'markDisrupted',
                ],
              },
            },
          },
        },
      },
      'description': 'Exactly one revision fence for every selected leg; missing, duplicate, extraneous or stale fences abort dispatch.',
      'minItems': 1,
      'uniqueItems': true,
    },
    'departedAtMillis': <String, Object?>{
      'type': <Object?>[
        'integer',
        'null',
      ],
      'minimum': 0,
      'maximum': 253402300799999,
      'description': 'Explicit departure timestamp for late offline sync; defaults to server now.',
    },
    'notes': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 280,
    },
    'clientOperationId': <String, Object?>{
      'type': 'string',
      'minLength': 8,
      'maxLength': 120,
    },
  },
};
