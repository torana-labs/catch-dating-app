// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/update_private_event_preferences_payload.schema.json.

const schemaUpdatePrivateEventPreferencesCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/update_private_event_preferences_payload.schema.json',
  'title': 'UpdatePrivateEventPreferencesCallablePayload',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'organizerId',
    'eventId',
    'requestId',
    'expectedSetupRevision',
    'expectedPreferencesRevision',
    'reviewedDefaultsHash',
    'intents',
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
      'maximum': 1000000000,
    },
    'expectedPreferencesRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 1000000000,
    },
    'reviewedDefaultsHash': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
    'intents': <String, Object?>{
      'title': 'EventPreferenceIntents',
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
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
        'usualDurationMinutes': <String, Object?>{
          'oneOf': <Object?>[
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'mode',
                'value',
              ],
              'properties': <String, Object?>{
                'mode': <String, Object?>{
                  'type': 'string',
                  'const': 'set',
                },
                'value': <String, Object?>{
                  'type': 'integer',
                  'minimum': 15,
                  'maximum': 240,
                },
              },
            },
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'mode',
              ],
              'properties': <String, Object?>{
                'mode': <String, Object?>{
                  'type': 'string',
                  'const': 'clear',
                },
              },
            },
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'mode',
              ],
              'properties': <String, Object?>{
                'mode': <String, Object?>{
                  'type': 'string',
                  'const': 'inherit',
                },
              },
            },
          ],
        },
        'preferredVenueId': <String, Object?>{
          'oneOf': <Object?>[
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'mode',
                'value',
              ],
              'properties': <String, Object?>{
                'mode': <String, Object?>{
                  'type': 'string',
                  'const': 'set',
                },
                'value': <String, Object?>{
                  'type': 'string',
                  'pattern': '^[A-Za-z0-9][A-Za-z0-9_-]{0,119}\$',
                },
              },
            },
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'mode',
              ],
              'properties': <String, Object?>{
                'mode': <String, Object?>{
                  'type': 'string',
                  'const': 'clear',
                },
              },
            },
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'mode',
              ],
              'properties': <String, Object?>{
                'mode': <String, Object?>{
                  'type': 'string',
                  'const': 'inherit',
                },
              },
            },
          ],
        },
        'offerValidityMinutes': <String, Object?>{
          'oneOf': <Object?>[
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'mode',
                'value',
              ],
              'properties': <String, Object?>{
                'mode': <String, Object?>{
                  'type': 'string',
                  'const': 'set',
                },
                'value': <String, Object?>{
                  'type': 'integer',
                  'minimum': 5,
                  'maximum': 10080,
                },
              },
            },
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'mode',
              ],
              'properties': <String, Object?>{
                'mode': <String, Object?>{
                  'type': 'string',
                  'const': 'clear',
                },
              },
            },
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'mode',
              ],
              'properties': <String, Object?>{
                'mode': <String, Object?>{
                  'type': 'string',
                  'const': 'inherit',
                },
              },
            },
          ],
        },
        'collectionPreference': <String, Object?>{
          'oneOf': <Object?>[
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'mode',
                'value',
              ],
              'properties': <String, Object?>{
                'mode': <String, Object?>{
                  'type': 'string',
                  'const': 'set',
                },
                'value': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'manualInstructions',
                    'reusablePage',
                    'personalRequest',
                    'catchCheckout',
                  ],
                },
              },
            },
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'mode',
              ],
              'properties': <String, Object?>{
                'mode': <String, Object?>{
                  'type': 'string',
                  'const': 'clear',
                },
              },
            },
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'mode',
              ],
              'properties': <String, Object?>{
                'mode': <String, Object?>{
                  'type': 'string',
                  'const': 'inherit',
                },
              },
            },
          ],
        },
        'currency': <String, Object?>{
          'oneOf': <Object?>[
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'mode',
                'value',
              ],
              'properties': <String, Object?>{
                'mode': <String, Object?>{
                  'type': 'string',
                  'const': 'set',
                },
                'value': <String, Object?>{
                  'type': 'string',
                  'pattern': '^[A-Z]{3}\$',
                },
              },
            },
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'mode',
              ],
              'properties': <String, Object?>{
                'mode': <String, Object?>{
                  'type': 'string',
                  'const': 'clear',
                },
              },
            },
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'mode',
              ],
              'properties': <String, Object?>{
                'mode': <String, Object?>{
                  'type': 'string',
                  'const': 'inherit',
                },
              },
            },
          ],
        },
        'offerMessageTemplate': <String, Object?>{
          'oneOf': <Object?>[
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'mode',
                'value',
              ],
              'properties': <String, Object?>{
                'mode': <String, Object?>{
                  'type': 'string',
                  'const': 'set',
                },
                'value': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 1000,
                },
              },
            },
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'mode',
              ],
              'properties': <String, Object?>{
                'mode': <String, Object?>{
                  'type': 'string',
                  'const': 'clear',
                },
              },
            },
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'mode',
              ],
              'properties': <String, Object?>{
                'mode': <String, Object?>{
                  'type': 'string',
                  'const': 'inherit',
                },
              },
            },
          ],
        },
        'paymentInstructions': <String, Object?>{
          'oneOf': <Object?>[
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'mode',
                'value',
              ],
              'properties': <String, Object?>{
                'mode': <String, Object?>{
                  'type': 'string',
                  'const': 'set',
                },
                'value': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 1000,
                },
              },
            },
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'mode',
              ],
              'properties': <String, Object?>{
                'mode': <String, Object?>{
                  'type': 'string',
                  'const': 'clear',
                },
              },
            },
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'mode',
              ],
              'properties': <String, Object?>{
                'mode': <String, Object?>{
                  'type': 'string',
                  'const': 'inherit',
                },
              },
            },
          ],
        },
        'reusablePaymentPage': <String, Object?>{
          'oneOf': <Object?>[
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'mode',
                'value',
              ],
              'properties': <String, Object?>{
                'mode': <String, Object?>{
                  'type': 'string',
                  'const': 'set',
                },
                'value': <String, Object?>{
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
              },
            },
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'mode',
              ],
              'properties': <String, Object?>{
                'mode': <String, Object?>{
                  'type': 'string',
                  'const': 'clear',
                },
              },
            },
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'mode',
              ],
              'properties': <String, Object?>{
                'mode': <String, Object?>{
                  'type': 'string',
                  'const': 'inherit',
                },
              },
            },
          ],
        },
        'admissionPreset': <String, Object?>{
          'oneOf': <Object?>[
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'mode',
                'value',
              ],
              'properties': <String, Object?>{
                'mode': <String, Object?>{
                  'type': 'string',
                  'const': 'set',
                },
                'value': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'openCapacity',
                    'inviteOnly',
                    'balancedSingles',
                    'fixedCohortCaps',
                  ],
                },
              },
            },
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'mode',
              ],
              'properties': <String, Object?>{
                'mode': <String, Object?>{
                  'type': 'string',
                  'const': 'clear',
                },
              },
            },
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'mode',
              ],
              'properties': <String, Object?>{
                'mode': <String, Object?>{
                  'type': 'string',
                  'const': 'inherit',
                },
              },
            },
          ],
        },
        'expectedAmountMinor': <String, Object?>{
          'oneOf': <Object?>[
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'mode',
                'value',
              ],
              'properties': <String, Object?>{
                'mode': <String, Object?>{
                  'type': 'string',
                  'const': 'set',
                },
                'value': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                  'maximum': 100000000,
                },
              },
            },
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'mode',
              ],
              'properties': <String, Object?>{
                'mode': <String, Object?>{
                  'type': 'string',
                  'const': 'clear',
                },
              },
            },
          ],
        },
      },
    },
    'expectedActorUid': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
  },
};
