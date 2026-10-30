// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/organizer_event_setup_defaults.schema.json.

const schemaOrganizerEventSetupDefaultsDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/organizer_event_setup_defaults.schema.json',
  'title': 'OrganizerEventSetupDefaultsDocument',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'organizerId',
    'revision',
    'eventSetup',
    'updatedAt',
    'updatedByUid',
  ],
  'properties': <String, Object?>{
    'organizerId': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9][A-Za-z0-9_-]{0,119}\$',
    },
    'revision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 1000000000,
    },
    'eventSetup': <String, Object?>{
      'title': 'OrganizerEventSetupPreferences',
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[],
      'properties': <String, Object?>{
        'usualDurationMinutes': <String, Object?>{
          'type': 'integer',
          'minimum': 15,
          'maximum': 240,
        },
        'preferredVenueId': <String, Object?>{
          'type': 'string',
          'pattern': '^[A-Za-z0-9][A-Za-z0-9_-]{0,119}\$',
        },
        'offerValidityMinutes': <String, Object?>{
          'type': 'integer',
          'minimum': 5,
          'maximum': 10080,
        },
        'collectionPreference': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'manualInstructions',
            'reusablePage',
            'personalRequest',
            'catchCheckout',
          ],
        },
        'currency': <String, Object?>{
          'type': 'string',
          'pattern': '^[A-Z]{3}\$',
        },
        'offerMessageTemplate': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 1000,
        },
        'paymentInstructions': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 1000,
        },
        'reusablePaymentPage': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'url',
            'reusableForEvents',
          ],
          'properties': <String, Object?>{
            'url': <String, Object?>{
              'type': 'string',
              'format': 'uri',
              'maxLength': 2048,
            },
            'reusableForEvents': <String, Object?>{
              'type': 'boolean',
              'const': true,
            },
          },
        },
        'timezone': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 100,
        },
      },
    },
    'updatedAt': <String, Object?>{
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
    'updatedByUid': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9][A-Za-z0-9_-]{0,119}\$',
    },
  },
  'x-firestore-collection': 'organizerEventSetupDefaults',
  'x-firestore-path': 'organizerEventSetupDefaults/{organizerId}',
  'x-document-id-field': 'organizerId',
  'x-owner': 'organizer event setup manager operations',
};
