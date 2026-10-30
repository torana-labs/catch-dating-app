// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/submit_program_household_rsvp_payload.schema.json.

const schemaSubmitProgramHouseholdRsvpCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/submit_program_household_rsvp_payload.schema.json',
  'title': 'SubmitProgramHouseholdRsvpCallablePayload',
  'description': 'Token-authenticated household RSVP submit. Responses are limited to guests in the token\'s household and apply atomically. messagingConsent records the explicit checkbox state; it is never implied by submitting.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'token',
    'responses',
    'messagingConsent',
  ],
  'properties': <String, Object?>{
    'token': <String, Object?>{
      'type': 'string',
      'minLength': 16,
      'maxLength': 1024,
    },
    'responses': <String, Object?>{
      'type': 'array',
      'maxItems': 2000,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'guestId',
          'functionId',
          'rsvpStatus',
        ],
        'properties': <String, Object?>{
          'guestId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
          },
          'functionId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
          },
          'rsvpStatus': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'pending',
              'attending',
              'declined',
              'maybe',
            ],
          },
          'partySize': <String, Object?>{
            'type': <Object?>[
              'integer',
              'null',
            ],
            'minimum': 1,
            'maximum': 20,
          },
          'responseNote': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
            'maxLength': 500,
          },
        },
      },
    },
    'messagingConsent': <String, Object?>{
      'type': 'boolean',
      'description': 'The explicit household messaging-consent checkbox; recorded exactly as ticked.',
    },
    'travel': <String, Object?>{
      'type': <Object?>[
        'array',
        'null',
      ],
      'maxItems': 400,
      'description': 'Optional per-member travel capture. Each block writes one programTravelLegs row keyed deterministically by household, guest, and journey kind, so resubmits update in place. A block is the complete desired state of that leg; absent blocks never delete planner-owned or previously captured journeys.',
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'guestId',
          'kind',
        ],
        'properties': <String, Object?>{
          'guestId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
          },
          'kind': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'inbound',
              'outbound',
              'ground',
            ],
          },
          'flightNumber': <String, Object?>{
            'anyOf': <Object?>[
              <String, Object?>{
                'type': 'string',
                'pattern': '^[A-Z0-9]{2,3}-?[0-9]{1,4}[A-Z]?\$',
              },
              <String, Object?>{
                'type': 'null',
              },
            ],
          },
          'carrierCode': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
            'maxLength': 3,
          },
          'originIata': <String, Object?>{
            'anyOf': <Object?>[
              <String, Object?>{
                'type': 'string',
                'pattern': '^[A-Z]{3}\$',
              },
              <String, Object?>{
                'type': 'null',
              },
            ],
          },
          'destinationIata': <String, Object?>{
            'anyOf': <Object?>[
              <String, Object?>{
                'type': 'string',
                'pattern': '^[A-Z]{3}\$',
              },
              <String, Object?>{
                'type': 'null',
              },
            ],
          },
          'scheduledArrivalAtMillis': <String, Object?>{
            'type': <Object?>[
              'integer',
              'null',
            ],
            'minimum': 0,
            'maximum': 253402300799999,
          },
          'pickupPointId': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
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
          'passengers': <String, Object?>{
            'type': <Object?>[
              'integer',
              'null',
            ],
            'minimum': 1,
            'maximum': 200,
            'description': 'Defaults to 1 when omitted.',
          },
          'luggageUnits': <String, Object?>{
            'type': <Object?>[
              'integer',
              'null',
            ],
            'minimum': 0,
            'maximum': 500,
            'description': 'Defaults to 0 when omitted.',
          },
        },
      },
    },
  },
};
