// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from embedded/event_setup_defaults.schema.json.

const schemaEventSetupDefaultsSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/embedded/event_setup_defaults.schema.json',
  'title': 'EventSetupDefaults',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'city',
    'timezone',
    'organizerDefaultsRevision',
    'organizerDefaultsHash',
  ],
  'properties': <String, Object?>{
    'city': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'value',
        'source',
      ],
      'properties': <String, Object?>{
        'value': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'cityId',
            'marketId',
          ],
          'properties': <String, Object?>{
            'cityId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 180,
            },
            'marketId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 180,
            },
          },
        },
        'source': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'organizer',
            'event',
          ],
        },
      },
    },
    'timezone': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'value',
        'source',
      ],
      'properties': <String, Object?>{
        'value': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 100,
        },
        'source': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'organizer',
            'event',
          ],
        },
      },
    },
    'organizerDefaultsRevision': <String, Object?>{
      'type': <Object?>[
        'integer',
        'null',
      ],
      'minimum': 0,
    },
    'organizerDefaultsHash': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
  },
  'definitions': <String, Object?>{
    'basicsInput': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'name',
        'city',
        'localDate',
        'localStartTime',
        'timezone',
      ],
      'properties': <String, Object?>{
        'name': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 120,
        },
        'city': <String, Object?>{
          'oneOf': <Object?>[
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'mode',
              ],
              'properties': <String, Object?>{
                'mode': <String, Object?>{
                  'const': 'inherit',
                  'type': 'string',
                },
              },
            },
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'mode',
                'value',
              ],
              'properties': <String, Object?>{
                'mode': <String, Object?>{
                  'const': 'set',
                  'type': 'string',
                },
                'value': <String, Object?>{
                  'type': 'object',
                  'additionalProperties': false,
                  'required': <Object?>[
                    'cityId',
                    'marketId',
                  ],
                  'properties': <String, Object?>{
                    'cityId': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 180,
                    },
                    'marketId': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 180,
                    },
                  },
                },
              },
            },
          ],
        },
        'localDate': <String, Object?>{
          'type': 'string',
          'pattern': '^[0-9]{4}-[0-9]{2}-[0-9]{2}\$',
        },
        'localStartTime': <String, Object?>{
          'type': 'string',
          'pattern': '^[0-9]{2}:[0-9]{2}\$',
        },
        'timezone': <String, Object?>{
          'oneOf': <Object?>[
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'mode',
              ],
              'properties': <String, Object?>{
                'mode': <String, Object?>{
                  'const': 'inherit',
                  'type': 'string',
                },
              },
            },
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'mode',
                'value',
              ],
              'properties': <String, Object?>{
                'mode': <String, Object?>{
                  'const': 'set',
                  'type': 'string',
                },
                'value': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 100,
                },
              },
            },
          ],
        },
        'reviewedDefaultsHash': <String, Object?>{
          'type': 'string',
          'pattern': '^[a-f0-9]{64}\$',
        },
      },
    },
  },
};
