// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/event_offer_configuration_response.schema.json.

const schemaEventOfferConfigurationCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/event_offer_configuration_response.schema.json',
  'title': 'EventOfferConfigurationCallableResponse',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'organizerId',
    'eventId',
    'eventSourceRevision',
    'startsAtMillis',
    'nowMillis',
    'paymentTerms',
    'suggestedExpiresAtMillis',
    'preferencesRevision',
    'preferences',
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
    'eventSourceRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
    },
    'startsAtMillis': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
    },
    'nowMillis': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
    },
    'paymentTerms': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'null',
        },
        <String, Object?>{
          'title': 'EventPaymentTerms',
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'revision',
            'preferredCollection',
            'reusablePaymentPage',
            'paymentInstructions',
            'expectedAmountMinor',
            'currency',
            'offerValidityMinutes',
            'offerMessageTemplate',
            'sourceDefaultsRevision',
            'sourceDefaultsHash',
            'fieldSources',
          ],
          'properties': <String, Object?>{
            'revision': <String, Object?>{
              'type': 'integer',
              'minimum': 1,
              'maximum': 1000000000,
            },
            'preferredCollection': <String, Object?>{
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
            'reusablePaymentPage': <String, Object?>{
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
            'paymentInstructions': <String, Object?>{
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
            'expectedAmountMinor': <String, Object?>{
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
            'currency': <String, Object?>{
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
            'offerValidityMinutes': <String, Object?>{
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
            'offerMessageTemplate': <String, Object?>{
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
            'sourceDefaultsRevision': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 1000000000,
            },
            'sourceDefaultsHash': <String, Object?>{
              'type': 'string',
              'pattern': '^[a-f0-9]{64}\$',
            },
            'fieldSources': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'preferredCollection',
                'reusablePaymentPage',
                'paymentInstructions',
                'expectedAmountMinor',
                'currency',
                'offerValidityMinutes',
                'offerMessageTemplate',
              ],
              'properties': <String, Object?>{
                'preferredCollection': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'organizer',
                    'event',
                    'cleared',
                  ],
                },
                'reusablePaymentPage': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'organizer',
                    'event',
                    'cleared',
                  ],
                },
                'paymentInstructions': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'organizer',
                    'event',
                    'cleared',
                  ],
                },
                'expectedAmountMinor': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'organizer',
                    'event',
                    'cleared',
                  ],
                },
                'currency': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'organizer',
                    'event',
                    'cleared',
                  ],
                },
                'offerValidityMinutes': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'organizer',
                    'event',
                    'cleared',
                  ],
                },
                'offerMessageTemplate': <String, Object?>{
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
        },
      ],
    },
    'suggestedExpiresAtMillis': <String, Object?>{
      'type': <Object?>[
        'integer',
        'null',
      ],
      'minimum': 1,
    },
    'preferencesRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 1000000000,
    },
    'preferences': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'null',
        },
        <String, Object?>{
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
        },
      ],
    },
  },
};
