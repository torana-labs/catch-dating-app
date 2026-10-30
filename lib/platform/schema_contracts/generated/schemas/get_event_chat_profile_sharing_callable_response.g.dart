// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/get_event_chat_profile_sharing_response.schema.json.

const schemaGetEventChatProfileSharingCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/get_event_chat_profile_sharing_response.schema.json',
  'title': 'GetEventChatProfileSharingCallableResponse',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'eventId',
    'organizerId',
    'revision',
    'selection',
    'canShare',
    'profileRevision',
    'membershipRevision',
    'coreFields',
    'photoIds',
  ],
  'properties': <String, Object?>{
    'eventId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'organizerId': <String, Object?>{
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
    'revision': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
    },
    'selection': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'profileRevision',
            'membershipRevision',
            'coreFieldIds',
            'photoId',
            'card',
            'termsVersion',
          ],
          'properties': <String, Object?>{
            'profileRevision': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 9007199254740991,
            },
            'membershipRevision': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 9007199254740991,
            },
            'coreFieldIds': <String, Object?>{
              'type': 'array',
              'maxItems': 14,
              'uniqueItems': true,
              'items': <String, Object?>{
                'type': 'string',
                'enum': <Object?>[
                  'age',
                  'gender',
                  'city',
                  'heightCm',
                  'occupation',
                  'company',
                  'education',
                  'languages',
                  'relationshipGoal',
                  'drinking',
                  'smoking',
                  'workout',
                  'diet',
                  'children',
                ],
              },
            },
            'photoId': <String, Object?>{
              'anyOf': <Object?>[
                <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 80,
                  'pattern': '^[A-Za-z0-9_-]+\$',
                },
                <String, Object?>{
                  'type': 'null',
                },
              ],
            },
            'card': <String, Object?>{
              'anyOf': <Object?>[
                <String, Object?>{
                  'type': 'object',
                  'additionalProperties': false,
                  'required': <Object?>[
                    'responseId',
                    'revision',
                    'questionIds',
                  ],
                  'properties': <String, Object?>{
                    'responseId': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 180,
                    },
                    'revision': <String, Object?>{
                      'type': 'integer',
                      'minimum': 0,
                      'maximum': 9007199254740991,
                    },
                    'questionIds': <String, Object?>{
                      'type': 'array',
                      'uniqueItems': true,
                      'maxItems': 20,
                      'items': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 180,
                      },
                      'minItems': 1,
                    },
                  },
                },
                <String, Object?>{
                  'type': 'null',
                },
              ],
            },
            'firstName': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 80,
              'pattern': '^\\S(?:[\\s\\S]*\\S)?\$',
            },
            'introduction': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 500,
              'pattern': '^\\S(?:[\\s\\S]*\\S)?\$',
            },
            'termsVersion': <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'event-profile-sharing-v1',
                'event-profile-sharing-v2',
              ],
            },
          },
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'canShare': <String, Object?>{
      'type': 'boolean',
    },
    'profileRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
    },
    'membershipRevision': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 9007199254740991,
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'coreFields': <String, Object?>{
      'type': 'array',
      'maxItems': 14,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'fieldId',
          'value',
        ],
        'properties': <String, Object?>{
          'fieldId': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'age',
              'gender',
              'city',
              'heightCm',
              'occupation',
              'company',
              'education',
              'languages',
              'relationshipGoal',
              'drinking',
              'smoking',
              'workout',
              'diet',
              'children',
            ],
          },
          'value': <String, Object?>{
            'anyOf': <Object?>[
              <String, Object?>{
                'type': 'string',
                'maxLength': 10000,
              },
              <String, Object?>{
                'type': 'number',
              },
              <String, Object?>{
                'type': 'boolean',
              },
              <String, Object?>{
                'type': 'array',
                'maxItems': 100,
                'items': <String, Object?>{
                  'type': 'string',
                  'maxLength': 10000,
                },
              },
            ],
          },
        },
      },
    },
    'photoIds': <String, Object?>{
      'type': 'array',
      'maxItems': 12,
      'uniqueItems': true,
      'items': <String, Object?>{
        'type': 'string',
        'minLength': 1,
        'maxLength': 80,
      },
    },
    'preview': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'title': 'GetEventChatProfileCallableResponse',
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'eventId',
            'participantUid',
            'displayName',
            'coreFields',
            'cardFields',
            'photo',
          ],
          'properties': <String, Object?>{
            'eventId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 180,
            },
            'participantUid': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 180,
            },
            'displayName': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 120,
            },
            'introduction': <String, Object?>{
              'type': <Object?>[
                'string',
                'null',
              ],
              'maxLength': 500,
            },
            'coreFields': <String, Object?>{
              'type': 'array',
              'maxItems': 14,
              'items': <String, Object?>{
                'type': 'object',
                'additionalProperties': false,
                'required': <Object?>[
                  'fieldId',
                  'value',
                ],
                'properties': <String, Object?>{
                  'fieldId': <String, Object?>{
                    'type': 'string',
                    'enum': <Object?>[
                      'age',
                      'gender',
                      'city',
                      'heightCm',
                      'occupation',
                      'company',
                      'education',
                      'languages',
                      'relationshipGoal',
                      'drinking',
                      'smoking',
                      'workout',
                      'diet',
                      'children',
                    ],
                  },
                  'value': <String, Object?>{
                    'anyOf': <Object?>[
                      <String, Object?>{
                        'type': 'string',
                        'maxLength': 10000,
                      },
                      <String, Object?>{
                        'type': 'number',
                      },
                      <String, Object?>{
                        'type': 'boolean',
                      },
                      <String, Object?>{
                        'type': 'array',
                        'maxItems': 100,
                        'items': <String, Object?>{
                          'type': 'string',
                          'maxLength': 10000,
                        },
                      },
                    ],
                  },
                },
              },
            },
            'cardFields': <String, Object?>{
              'type': 'array',
              'maxItems': 20,
              'items': <String, Object?>{
                'type': 'object',
                'additionalProperties': false,
                'required': <Object?>[
                  'label',
                  'value',
                ],
                'properties': <String, Object?>{
                  'label': <String, Object?>{
                    'type': 'string',
                    'maxLength': 240,
                  },
                  'value': <String, Object?>{
                    'anyOf': <Object?>[
                      <String, Object?>{
                        'type': 'string',
                        'maxLength': 10000,
                      },
                      <String, Object?>{
                        'type': 'number',
                      },
                      <String, Object?>{
                        'type': 'boolean',
                      },
                      <String, Object?>{
                        'type': 'array',
                        'maxItems': 100,
                        'items': <String, Object?>{
                          'type': 'string',
                          'maxLength': 10000,
                        },
                      },
                    ],
                  },
                },
              },
            },
            'photo': <String, Object?>{
              'anyOf': <Object?>[
                <String, Object?>{
                  'type': 'object',
                  'additionalProperties': false,
                  'title': 'GetParticipantFormPhotoCallableResponse',
                  'description': 'Bounded metadata-free JPEG bytes for private in-memory review; never an original upload URL.',
                  'required': <Object?>[
                    'contentType',
                    'previewBase64',
                    'width',
                    'height',
                  ],
                  'properties': <String, Object?>{
                    'contentType': <String, Object?>{
                      'type': 'string',
                      'const': 'image/jpeg',
                    },
                    'previewBase64': <String, Object?>{
                      'type': 'string',
                      'minLength': 4,
                      'maxLength': 349528,
                      'pattern': '^[A-Za-z0-9+/]+={0,2}\$',
                    },
                    'width': <String, Object?>{
                      'type': 'integer',
                      'minimum': 1,
                      'maximum': 640,
                    },
                    'height': <String, Object?>{
                      'type': 'integer',
                      'minimum': 1,
                      'maximum': 640,
                    },
                  },
                },
                <String, Object?>{
                  'type': 'null',
                },
              ],
            },
          },
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
  },
};
