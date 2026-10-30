// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from embedded/resolved_event_preferences.schema.json.

const schemaResolvedEventPreferencesSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/embedded/resolved_event_preferences.schema.json',
  'title': 'ResolvedEventPreferences',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'defaultsRevision',
    'defaultsHash',
    'usualDurationMinutes',
    'preferredVenueId',
    'offerValidityMinutes',
    'collectionPreference',
    'currency',
    'offerMessageTemplate',
    'paymentInstructions',
    'reusablePaymentPage',
    'admissionPreset',
    'expectedAmountMinor',
  ],
  'properties': <String, Object?>{
    'defaultsRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 1000000000,
    },
    'defaultsHash': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
    'usualDurationMinutes': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'value',
        'source',
      ],
      'properties': <String, Object?>{
        'value': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'integer',
              'minimum': 15,
              'maximum': 240,
            },
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
        'source': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'organizer',
            'event',
            'cleared',
          ],
        },
      },
    },
    'preferredVenueId': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'value',
        'source',
      ],
      'properties': <String, Object?>{
        'value': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'string',
              'pattern': '^[A-Za-z0-9][A-Za-z0-9_-]{0,119}\$',
            },
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
        'source': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'organizer',
            'event',
            'cleared',
          ],
        },
      },
    },
    'offerValidityMinutes': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'value',
        'source',
      ],
      'properties': <String, Object?>{
        'value': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'integer',
              'minimum': 5,
              'maximum': 10080,
            },
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
        'source': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'organizer',
            'event',
            'cleared',
          ],
        },
      },
    },
    'collectionPreference': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'value',
        'source',
      ],
      'properties': <String, Object?>{
        'value': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'manualInstructions',
                'reusablePage',
                'personalRequest',
                'catchCheckout',
              ],
            },
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
        'source': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'organizer',
            'event',
            'cleared',
          ],
        },
      },
    },
    'currency': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'value',
        'source',
      ],
      'properties': <String, Object?>{
        'value': <String, Object?>{
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
        'source': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'organizer',
            'event',
            'cleared',
          ],
        },
      },
    },
    'offerMessageTemplate': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'value',
        'source',
      ],
      'properties': <String, Object?>{
        'value': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 1000,
            },
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
        'source': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'organizer',
            'event',
            'cleared',
          ],
        },
      },
    },
    'paymentInstructions': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'value',
        'source',
      ],
      'properties': <String, Object?>{
        'value': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 1000,
            },
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
        'source': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'organizer',
            'event',
            'cleared',
          ],
        },
      },
    },
    'reusablePaymentPage': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'value',
        'source',
      ],
      'properties': <String, Object?>{
        'value': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
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
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
        'source': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'organizer',
            'event',
            'cleared',
          ],
        },
      },
    },
    'admissionPreset': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'value',
        'source',
      ],
      'properties': <String, Object?>{
        'value': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'openCapacity',
                'inviteOnly',
                'balancedSingles',
                'fixedCohortCaps',
              ],
            },
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
        'source': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'organizer',
            'event',
            'cleared',
          ],
        },
      },
    },
    'expectedAmountMinor': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'value',
        'source',
      ],
      'properties': <String, Object?>{
        'value': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 100000000,
            },
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
        'source': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'organizer',
            'event',
            'cleared',
          ],
        },
      },
    },
  },
};
