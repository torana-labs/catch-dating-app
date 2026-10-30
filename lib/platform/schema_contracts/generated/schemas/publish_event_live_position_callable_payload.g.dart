// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/publish_event_live_position_payload.schema.json.

const schemaPublishEventLivePositionCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/publish_event_live_position_payload.schema.json',
  'title': 'PublishEventLivePositionCallablePayload',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'eventId',
    'sharing',
    'latitude',
    'longitude',
    'accuracyMeters',
    'headingDegrees',
  ],
  'properties': <String, Object?>{
    'eventId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'sharing': <String, Object?>{
      'type': 'boolean',
    },
    'latitude': <String, Object?>{
      'type': <Object?>[
        'number',
        'null',
      ],
      'minimum': -90,
      'maximum': 90,
    },
    'longitude': <String, Object?>{
      'type': <Object?>[
        'number',
        'null',
      ],
      'minimum': -180,
      'maximum': 180,
    },
    'accuracyMeters': <String, Object?>{
      'type': <Object?>[
        'number',
        'null',
      ],
      'minimum': 0,
      'maximum': 10000,
    },
    'headingDegrees': <String, Object?>{
      'type': <Object?>[
        'number',
        'null',
      ],
      'minimum': 0,
      'exclusiveMaximum': 360,
    },
  },
  'allOf': <Object?>[
    <String, Object?>{
      'if': <String, Object?>{
        'properties': <String, Object?>{
          'sharing': <String, Object?>{
            'const': true,
          },
        },
      },
      'then': <String, Object?>{
        'properties': <String, Object?>{
          'latitude': <String, Object?>{
            'type': 'number',
            'minimum': -90,
            'maximum': 90,
          },
          'longitude': <String, Object?>{
            'type': 'number',
            'minimum': -180,
            'maximum': 180,
          },
        },
      },
      'else': <String, Object?>{
        'properties': <String, Object?>{
          'latitude': <String, Object?>{
            'type': 'null',
          },
          'longitude': <String, Object?>{
            'type': 'null',
          },
          'accuracyMeters': <String, Object?>{
            'type': 'null',
          },
          'headingDegrees': <String, Object?>{
            'type': 'null',
          },
        },
      },
    },
  ],
};
