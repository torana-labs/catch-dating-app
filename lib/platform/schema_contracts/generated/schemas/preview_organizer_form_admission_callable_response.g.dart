// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/preview_organizer_form_admission_response.schema.json.

const schemaPreviewOrganizerFormAdmissionCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/preview_organizer_form_admission_response.schema.json',
  'title': 'PreviewOrganizerFormAdmissionCallableResponse',
  'description': 'Read-only admission review of the same source, payment, identity and seat checks as commit. Never reserves a seat.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'organizerId',
    'eventId',
    'responseId',
    'contactId',
    'offerId',
    'canCommit',
    'expectedOfferRevision',
    'expectedOfferGeneration',
    'expectedLedgerRevision',
    'seatAlreadyOccupied',
    'paymentAuthority',
    'blocker',
  ],
  'properties': <String, Object?>{
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'pattern': '^[A-Za-z0-9_-]{1,180}\$',
    },
    'eventId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'pattern': '^[A-Za-z0-9_-]{1,180}\$',
    },
    'responseId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'pattern': '^[A-Za-z0-9_-]{1,180}\$',
    },
    'contactId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'pattern': '^[A-Za-z0-9_-]{1,180}\$',
    },
    'offerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'pattern': '^[A-Za-z0-9_-]{1,180}\$',
    },
    'canCommit': <String, Object?>{
      'type': 'boolean',
    },
    'expectedOfferRevision': <String, Object?>{
      'type': <Object?>[
        'integer',
        'null',
      ],
      'minimum': 1,
      'maximum': 9007199254740991,
    },
    'expectedOfferGeneration': <String, Object?>{
      'type': <Object?>[
        'integer',
        'null',
      ],
      'minimum': 1,
      'maximum': 9007199254740991,
    },
    'expectedLedgerRevision': <String, Object?>{
      'type': <Object?>[
        'integer',
        'null',
      ],
      'minimum': 1,
      'maximum': 9007199254740991,
    },
    'seatAlreadyOccupied': <String, Object?>{
      'type': <Object?>[
        'boolean',
        'null',
      ],
    },
    'paymentAuthority': <String, Object?>{
      'enum': <Object?>[
        'explicitFree',
        'hostAttested',
        null,
      ],
    },
    'blocker': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'null',
        },
        <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'code',
            'message',
          ],
          'properties': <String, Object?>{
            'code': <String, Object?>{
              'enum': <Object?>[
                'unavailable',
                'stale',
                'conflict',
              ],
            },
            'message': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 500,
            },
          },
        },
      ],
    },
  },
};
