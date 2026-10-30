// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/update_organizer_event_setup_defaults_payload.schema.json.

const schemaUpdateOrganizerEventSetupDefaultsCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/update_organizer_event_setup_defaults_payload.schema.json',
  'title': 'UpdateOrganizerEventSetupDefaultsCallablePayload',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'organizerId',
    'requestId',
    'expectedRevision',
    'reviewedDefaultsHash',
    'changes',
  ],
  'properties': <String, Object?>{
    'organizerId': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9][A-Za-z0-9_-]{0,119}\$',
    },
    'requestId': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9][A-Za-z0-9_-]{7,127}\$',
    },
    'expectedRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 1000000000,
    },
    'reviewedDefaultsHash': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
    'changes': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[],
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
                  'const': 'set',
                  'type': 'string',
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
                  'const': 'clear',
                  'type': 'string',
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
                  'const': 'set',
                  'type': 'string',
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
                  'const': 'clear',
                  'type': 'string',
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
                  'const': 'set',
                  'type': 'string',
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
                  'const': 'clear',
                  'type': 'string',
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
                  'const': 'set',
                  'type': 'string',
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
                  'const': 'clear',
                  'type': 'string',
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
                  'const': 'set',
                  'type': 'string',
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
                  'const': 'clear',
                  'type': 'string',
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
                  'const': 'set',
                  'type': 'string',
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
                  'const': 'clear',
                  'type': 'string',
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
                  'const': 'set',
                  'type': 'string',
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
                  'const': 'clear',
                  'type': 'string',
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
                  'const': 'set',
                  'type': 'string',
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
                  'const': 'clear',
                  'type': 'string',
                },
              },
            },
          ],
        },
        'timezone': <String, Object?>{
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
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'mode',
              ],
              'properties': <String, Object?>{
                'mode': <String, Object?>{
                  'const': 'clear',
                  'type': 'string',
                },
              },
            },
          ],
        },
      },
      'minProperties': 1,
      'maxProperties': 9,
    },
  },
};
