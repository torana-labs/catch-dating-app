// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from embedded/event_origin.schema.json.

const schemaEventOriginSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/embedded/event_origin.schema.json',
  'title': 'EventOrigin',
  'description': 'Immutable booking and roster provenance for one operational event.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'mode',
    'bookingAuthority',
    'rosterAuthority',
    'provider',
    'externalEventId',
    'externalEventUrl',
    'sourceExternalEventId',
    'adapterVersion',
    'connectedAt',
    'connectedBy',
  ],
  'properties': <String, Object?>{
    'mode': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'catchNative',
        'externalCompanion',
      ],
    },
    'bookingAuthority': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'catch',
        'external',
      ],
    },
    'rosterAuthority': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'catchProjection',
        'hostImport',
        'providerSync',
      ],
    },
    'provider': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'catch',
        'generic',
        'luma',
        'eventbrite',
        'partiful',
        'posh',
        'bookmyshow',
        'district',
        'sortmyscene',
        'airbnb',
      ],
    },
    'externalEventId': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 240,
    },
    'externalEventUrl': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'format': 'uri',
          'maxLength': 2048,
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'sourceExternalEventId': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 1,
      'maxLength': 180,
    },
    'adapterVersion': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 1,
      'maxLength': 80,
    },
    'connectedAt': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
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
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'connectedBy': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 1,
      'maxLength': 180,
    },
  },
};
