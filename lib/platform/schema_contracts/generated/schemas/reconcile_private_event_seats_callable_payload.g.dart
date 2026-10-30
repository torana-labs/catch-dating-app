// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/reconcile_private_event_seats_payload.schema.json.

const schemaReconcilePrivateEventSeatsCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/reconcile_private_event_seats_payload.schema.json',
  'title': 'ReconcilePrivateEventSeatsCallablePayload',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'organizerId',
    'eventId',
    'requestId',
    'expectedSetupRevision',
    'reviewedDefaultsHash',
    'details',
  ],
  'properties': <String, Object?>{
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
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
    'expectedSetupRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 999999999,
    },
    'reviewedDefaultsHash': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
    'details': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'admissionTerms',
      ],
      'properties': <String, Object?>{
        'admissionTerms': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'capacityLimit',
            'priceInPaise',
            'currency',
            'cancellationPolicyId',
          ],
          'properties': <String, Object?>{
            'capacityLimit': <String, Object?>{
              'type': 'integer',
              'minimum': 1,
              'maximum': 1000,
            },
            'priceInPaise': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 100000000,
            },
            'currency': <String, Object?>{
              'type': 'string',
              'pattern': '^[A-Z]{3}\$',
            },
            'cancellationPolicyId': <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'notApplicable',
                'flexible',
                'standard',
                'strict',
              ],
            },
          },
        },
      },
    },
    'discard': <String, Object?>{
      'type': 'boolean',
    },
  },
};
