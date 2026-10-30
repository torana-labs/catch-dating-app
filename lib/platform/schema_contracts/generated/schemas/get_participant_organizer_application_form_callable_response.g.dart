// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/get_participant_organizer_application_form_response.schema.json.

const schemaGetParticipantOrganizerApplicationFormCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/get_participant_organizer_application_form_response.schema.json',
  'title': 'GetParticipantOrganizerApplicationFormCallableResponse',
  'description': 'Published application form plus participant-private suggestions. Suggested values require explicit review and never grant organizer access.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'organizerId',
    'formId',
    'formVersionId',
    'targetKind',
    'targetId',
    'title',
    'description',
    'questions',
    'consentCopy',
    'consentVersion',
    'retentionCopy',
  ],
  'properties': <String, Object?>{
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'formId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'formVersionId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'targetKind': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'organizer',
        'event',
        'campaign',
      ],
    },
    'targetId': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 1,
      'maxLength': 180,
    },
    'title': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 160,
    },
    'description': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 1000,
    },
    'questions': <String, Object?>{
      'type': 'array',
      'minItems': 1,
      'maxItems': 100,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'question',
          'suggestion',
        ],
        'properties': <String, Object?>{
          'question': <String, Object?>{
            'type': 'object',
            'additionalProperties': false,
            'required': <Object?>[
              'questionId',
              'key',
              'label',
              'helpText',
              'kind',
              'required',
              'options',
              'canonicalFieldId',
              'privacyClass',
              'prefillPolicy',
              'hostPresentation',
            ],
            'properties': <String, Object?>{
              'questionId': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 120,
              },
              'key': <String, Object?>{
                'type': 'string',
                'pattern': '^[A-Za-z][A-Za-z0-9_]{0,79}\$',
              },
              'label': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 240,
              },
              'helpText': <String, Object?>{
                'type': <Object?>[
                  'string',
                  'null',
                ],
                'maxLength': 500,
              },
              'kind': <String, Object?>{
                'type': 'string',
                'enum': <Object?>[
                  'shortText',
                  'longText',
                  'singleChoice',
                  'multiChoice',
                  'date',
                  'phone',
                  'email',
                  'url',
                  'number',
                  'boolean',
                  'file',
                ],
              },
              'required': <String, Object?>{
                'type': 'boolean',
              },
              'options': <String, Object?>{
                'type': 'array',
                'maxItems': 100,
                'items': <String, Object?>{
                  'type': 'object',
                  'additionalProperties': false,
                  'required': <Object?>[
                    'optionId',
                    'label',
                    'value',
                  ],
                  'properties': <String, Object?>{
                    'optionId': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 80,
                    },
                    'label': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 160,
                    },
                    'value': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 160,
                    },
                  },
                },
              },
              'canonicalFieldId': <String, Object?>{
                'anyOf': <Object?>[
                  <String, Object?>{
                    'type': 'string',
                    'x-catch-catalog': '../catalogs/person_fields.json',
                    'enum': <Object?>[
                      'givenName',
                      'familyName',
                      'displayName',
                      'dateOfBirth',
                      'age',
                      'gender',
                      'phoneNumber',
                      'email',
                      'instagramHandle',
                      'linkedinUrl',
                      'profilePhoto',
                      'city',
                      'heightCm',
                      'occupation',
                      'company',
                      'education',
                      'languages',
                      'relationshipGoal',
                      'interestedInGenders',
                      'drinking',
                      'smoking',
                      'religion',
                      'workout',
                      'diet',
                      'children',
                    ],
                  },
                  <String, Object?>{
                    'type': 'null',
                  },
                ],
              },
              'privacyClass': <String, Object?>{
                'type': 'string',
                'enum': <Object?>[
                  'contact',
                  'profile',
                  'sensitive',
                  'organizerCustom',
                ],
              },
              'prefillPolicy': <String, Object?>{
                'type': 'string',
                'enum': <Object?>[
                  'never',
                  'participantReviewRequired',
                ],
              },
              'hostPresentation': <String, Object?>{
                'type': 'string',
                'enum': <Object?>[
                  'detailOnly',
                  'filterable',
                  'sortable',
                ],
              },
            },
          },
          'suggestion': <String, Object?>{
            'oneOf': <Object?>[
              <String, Object?>{
                'type': 'null',
              },
              <String, Object?>{
                'type': 'object',
                'additionalProperties': false,
                'required': <Object?>[
                  'value',
                  'source',
                  'requiresParticipantReview',
                ],
                'properties': <String, Object?>{
                  'value': <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'valueKind',
                      'textValue',
                      'numberValue',
                      'booleanValue',
                      'dateValue',
                      'optionValues',
                      'assetIds',
                    ],
                    'properties': <String, Object?>{
                      'valueKind': <String, Object?>{
                        'type': 'string',
                        'enum': <Object?>[
                          'empty',
                          'text',
                          'number',
                          'boolean',
                          'date',
                          'options',
                          'assets',
                        ],
                      },
                      'textValue': <String, Object?>{
                        'type': <Object?>[
                          'string',
                          'null',
                        ],
                        'maxLength': 4000,
                      },
                      'numberValue': <String, Object?>{
                        'type': <Object?>[
                          'number',
                          'null',
                        ],
                        'minimum': -1000000000,
                        'maximum': 1000000000,
                      },
                      'booleanValue': <String, Object?>{
                        'type': <Object?>[
                          'boolean',
                          'null',
                        ],
                      },
                      'dateValue': <String, Object?>{
                        'type': <Object?>[
                          'string',
                          'null',
                        ],
                        'format': 'date',
                      },
                      'optionValues': <String, Object?>{
                        'type': 'array',
                        'maxItems': 100,
                        'items': <String, Object?>{
                          'type': 'string',
                          'minLength': 1,
                          'maxLength': 160,
                        },
                      },
                      'assetIds': <String, Object?>{
                        'type': 'array',
                        'maxItems': 10,
                        'uniqueItems': true,
                        'items': <String, Object?>{
                          'type': 'string',
                          'minLength': 1,
                          'maxLength': 180,
                        },
                      },
                    },
                  },
                  'source': <String, Object?>{
                    'type': 'string',
                    'enum': <Object?>[
                      'portableIntake',
                      'privateProfile',
                      'verifiedAuth',
                    ],
                  },
                  'requiresParticipantReview': <String, Object?>{
                    'const': true,
                  },
                },
              },
            ],
          },
        },
      },
    },
    'consentCopy': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 2000,
    },
    'consentVersion': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 80,
    },
    'retentionCopy': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 1000,
    },
  },
  'definitions': <String, Object?>{
    'questionWithSuggestion': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'question',
        'suggestion',
      ],
      'properties': <String, Object?>{
        'question': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'questionId',
            'key',
            'label',
            'helpText',
            'kind',
            'required',
            'options',
            'canonicalFieldId',
            'privacyClass',
            'prefillPolicy',
            'hostPresentation',
          ],
          'properties': <String, Object?>{
            'questionId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 120,
            },
            'key': <String, Object?>{
              'type': 'string',
              'pattern': '^[A-Za-z][A-Za-z0-9_]{0,79}\$',
            },
            'label': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 240,
            },
            'helpText': <String, Object?>{
              'type': <Object?>[
                'string',
                'null',
              ],
              'maxLength': 500,
            },
            'kind': <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'shortText',
                'longText',
                'singleChoice',
                'multiChoice',
                'date',
                'phone',
                'email',
                'url',
                'number',
                'boolean',
                'file',
              ],
            },
            'required': <String, Object?>{
              'type': 'boolean',
            },
            'options': <String, Object?>{
              'type': 'array',
              'maxItems': 100,
              'items': <String, Object?>{
                'type': 'object',
                'additionalProperties': false,
                'required': <Object?>[
                  'optionId',
                  'label',
                  'value',
                ],
                'properties': <String, Object?>{
                  'optionId': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                    'maxLength': 80,
                  },
                  'label': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                    'maxLength': 160,
                  },
                  'value': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                    'maxLength': 160,
                  },
                },
              },
            },
            'canonicalFieldId': <String, Object?>{
              'anyOf': <Object?>[
                <String, Object?>{
                  'type': 'string',
                  'x-catch-catalog': '../catalogs/person_fields.json',
                  'enum': <Object?>[
                    'givenName',
                    'familyName',
                    'displayName',
                    'dateOfBirth',
                    'age',
                    'gender',
                    'phoneNumber',
                    'email',
                    'instagramHandle',
                    'linkedinUrl',
                    'profilePhoto',
                    'city',
                    'heightCm',
                    'occupation',
                    'company',
                    'education',
                    'languages',
                    'relationshipGoal',
                    'interestedInGenders',
                    'drinking',
                    'smoking',
                    'religion',
                    'workout',
                    'diet',
                    'children',
                  ],
                },
                <String, Object?>{
                  'type': 'null',
                },
              ],
            },
            'privacyClass': <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'contact',
                'profile',
                'sensitive',
                'organizerCustom',
              ],
            },
            'prefillPolicy': <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'never',
                'participantReviewRequired',
              ],
            },
            'hostPresentation': <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'detailOnly',
                'filterable',
                'sortable',
              ],
            },
          },
        },
        'suggestion': <String, Object?>{
          'oneOf': <Object?>[
            <String, Object?>{
              'type': 'null',
            },
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'value',
                'source',
                'requiresParticipantReview',
              ],
              'properties': <String, Object?>{
                'value': <String, Object?>{
                  'type': 'object',
                  'additionalProperties': false,
                  'required': <Object?>[
                    'valueKind',
                    'textValue',
                    'numberValue',
                    'booleanValue',
                    'dateValue',
                    'optionValues',
                    'assetIds',
                  ],
                  'properties': <String, Object?>{
                    'valueKind': <String, Object?>{
                      'type': 'string',
                      'enum': <Object?>[
                        'empty',
                        'text',
                        'number',
                        'boolean',
                        'date',
                        'options',
                        'assets',
                      ],
                    },
                    'textValue': <String, Object?>{
                      'type': <Object?>[
                        'string',
                        'null',
                      ],
                      'maxLength': 4000,
                    },
                    'numberValue': <String, Object?>{
                      'type': <Object?>[
                        'number',
                        'null',
                      ],
                      'minimum': -1000000000,
                      'maximum': 1000000000,
                    },
                    'booleanValue': <String, Object?>{
                      'type': <Object?>[
                        'boolean',
                        'null',
                      ],
                    },
                    'dateValue': <String, Object?>{
                      'type': <Object?>[
                        'string',
                        'null',
                      ],
                      'format': 'date',
                    },
                    'optionValues': <String, Object?>{
                      'type': 'array',
                      'maxItems': 100,
                      'items': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 160,
                      },
                    },
                    'assetIds': <String, Object?>{
                      'type': 'array',
                      'maxItems': 10,
                      'uniqueItems': true,
                      'items': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 180,
                      },
                    },
                  },
                },
                'source': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'portableIntake',
                    'privateProfile',
                    'verifiedAuth',
                  ],
                },
                'requiresParticipantReview': <String, Object?>{
                  'const': true,
                },
              },
            },
          ],
        },
      },
    },
    'suggestion': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'value',
        'source',
        'requiresParticipantReview',
      ],
      'properties': <String, Object?>{
        'value': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'valueKind',
            'textValue',
            'numberValue',
            'booleanValue',
            'dateValue',
            'optionValues',
            'assetIds',
          ],
          'properties': <String, Object?>{
            'valueKind': <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'empty',
                'text',
                'number',
                'boolean',
                'date',
                'options',
                'assets',
              ],
            },
            'textValue': <String, Object?>{
              'type': <Object?>[
                'string',
                'null',
              ],
              'maxLength': 4000,
            },
            'numberValue': <String, Object?>{
              'type': <Object?>[
                'number',
                'null',
              ],
              'minimum': -1000000000,
              'maximum': 1000000000,
            },
            'booleanValue': <String, Object?>{
              'type': <Object?>[
                'boolean',
                'null',
              ],
            },
            'dateValue': <String, Object?>{
              'type': <Object?>[
                'string',
                'null',
              ],
              'format': 'date',
            },
            'optionValues': <String, Object?>{
              'type': 'array',
              'maxItems': 100,
              'items': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 160,
              },
            },
            'assetIds': <String, Object?>{
              'type': 'array',
              'maxItems': 10,
              'uniqueItems': true,
              'items': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 180,
              },
            },
          },
        },
        'source': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'portableIntake',
            'privateProfile',
            'verifiedAuth',
          ],
        },
        'requiresParticipantReview': <String, Object?>{
          'const': true,
        },
      },
    },
  },
};
