// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/list_participant_messaging_preferences_response.schema.json.

const schemaListParticipantMessagingPreferencesCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/list_participant_messaging_preferences_response.schema.json',
  'title': 'ListParticipantMessagingPreferencesCallableResponse',
  'description': 'Bounded participant-only WhatsApp permission directory; no contact endpoints or CRM fields.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'catchPreference',
    'organizers',
    'nextCursor',
  ],
  'properties': <String, Object?>{
    'catchPreference': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'status',
        'receiptId',
      ],
      'properties': <String, Object?>{
        'status': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'unknown',
            'optedIn',
            'optedOut',
          ],
        },
        'purposes': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'properties': <String, Object?>{
            'eventOperations': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'status',
                'receiptId',
              ],
              'properties': <String, Object?>{
                'status': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'unknown',
                    'optedIn',
                    'optedOut',
                  ],
                },
                'receiptId': <String, Object?>{
                  'anyOf': <Object?>[
                    <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 180,
                    },
                    <String, Object?>{
                      'type': 'null',
                    },
                  ],
                },
              },
            },
            'marketing': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'status',
                'receiptId',
              ],
              'properties': <String, Object?>{
                'status': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'unknown',
                    'optedIn',
                    'optedOut',
                  ],
                },
                'receiptId': <String, Object?>{
                  'anyOf': <Object?>[
                    <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 180,
                    },
                    <String, Object?>{
                      'type': 'null',
                    },
                  ],
                },
              },
            },
          },
        },
        'receiptId': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 180,
            },
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
      },
    },
    'organizers': <String, Object?>{
      'type': 'array',
      'maxItems': 30,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'organizerId',
          'organizerName',
          'preference',
        ],
        'properties': <String, Object?>{
          'organizerId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
          },
          'organizerName': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
            'maxLength': 240,
          },
          'preference': <String, Object?>{
            'type': 'object',
            'additionalProperties': false,
            'required': <Object?>[
              'status',
              'receiptId',
            ],
            'properties': <String, Object?>{
              'status': <String, Object?>{
                'type': 'string',
                'enum': <Object?>[
                  'unknown',
                  'optedIn',
                  'optedOut',
                ],
              },
              'purposes': <String, Object?>{
                'type': 'object',
                'additionalProperties': false,
                'properties': <String, Object?>{
                  'eventOperations': <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'status',
                      'receiptId',
                    ],
                    'properties': <String, Object?>{
                      'status': <String, Object?>{
                        'type': 'string',
                        'enum': <Object?>[
                          'unknown',
                          'optedIn',
                          'optedOut',
                        ],
                      },
                      'receiptId': <String, Object?>{
                        'anyOf': <Object?>[
                          <String, Object?>{
                            'type': 'string',
                            'minLength': 1,
                            'maxLength': 180,
                          },
                          <String, Object?>{
                            'type': 'null',
                          },
                        ],
                      },
                    },
                  },
                  'marketing': <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'status',
                      'receiptId',
                    ],
                    'properties': <String, Object?>{
                      'status': <String, Object?>{
                        'type': 'string',
                        'enum': <Object?>[
                          'unknown',
                          'optedIn',
                          'optedOut',
                        ],
                      },
                      'receiptId': <String, Object?>{
                        'anyOf': <Object?>[
                          <String, Object?>{
                            'type': 'string',
                            'minLength': 1,
                            'maxLength': 180,
                          },
                          <String, Object?>{
                            'type': 'null',
                          },
                        ],
                      },
                    },
                  },
                },
              },
              'receiptId': <String, Object?>{
                'anyOf': <Object?>[
                  <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                    'maxLength': 180,
                  },
                  <String, Object?>{
                    'type': 'null',
                  },
                ],
              },
            },
          },
        },
      },
    },
    'nextCursor': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
  },
  'definitions': <String, Object?>{
    'purposeSummaries': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'properties': <String, Object?>{
        'eventOperations': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'status',
            'receiptId',
          ],
          'properties': <String, Object?>{
            'status': <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'unknown',
                'optedIn',
                'optedOut',
              ],
            },
            'receiptId': <String, Object?>{
              'anyOf': <Object?>[
                <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 180,
                },
                <String, Object?>{
                  'type': 'null',
                },
              ],
            },
          },
        },
        'marketing': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'status',
            'receiptId',
          ],
          'properties': <String, Object?>{
            'status': <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'unknown',
                'optedIn',
                'optedOut',
              ],
            },
            'receiptId': <String, Object?>{
              'anyOf': <Object?>[
                <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 180,
                },
                <String, Object?>{
                  'type': 'null',
                },
              ],
            },
          },
        },
      },
    },
    'purposeSummary': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'status',
        'receiptId',
      ],
      'properties': <String, Object?>{
        'status': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'unknown',
            'optedIn',
            'optedOut',
          ],
        },
        'receiptId': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 180,
            },
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
      },
    },
  },
};
