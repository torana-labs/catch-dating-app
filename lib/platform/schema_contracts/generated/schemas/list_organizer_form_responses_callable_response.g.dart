// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/list_organizer_form_responses_response.schema.json.

const schemaListOrganizerFormResponsesCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/list_organizer_form_responses_response.schema.json',
  'title': 'ListOrganizerFormResponsesCallableResponse',
  'description': 'Safe response inbox rows and opaque pagination cursor.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'organizerId',
    'items',
    'nextCursor',
  ],
  'properties': <String, Object?>{
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'versionScope': <String, Object?>{
      'description': 'Published native form version scope; null for all forms or imported forms. Version IDs are formId_vN for N from 1 through publishedVersion.',
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'activeVersionId',
            'publishedVersion',
          ],
          'properties': <String, Object?>{
            'activeVersionId': <String, Object?>{
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
            'publishedVersion': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 1000000,
            },
          },
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'items': <String, Object?>{
      'type': 'array',
      'maxItems': 100,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'responseId',
          'formId',
          'formTitle',
          'versionId',
          'version',
          'status',
          'identityKind',
          'identity',
          'sourceLinkId',
          'sourceLabel',
          'submittedAtMillis',
          'withdrawnAtMillis',
          'highlights',
          'conversionKinds',
        ],
        'properties': <String, Object?>{
          'responseId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
          },
          'formId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
          },
          'formTitle': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 160,
          },
          'versionId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
          },
          'version': <String, Object?>{
            'type': 'integer',
            'minimum': 1,
            'maximum': 1000000,
          },
          'status': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'submitted',
              'withdrawn',
            ],
          },
          'identityKind': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'anonymous',
              'emailVerified',
              'phoneVerified',
              'catchAccount',
            ],
          },
          'identity': <String, Object?>{
            'type': 'object',
            'additionalProperties': false,
            'required': <Object?>[
              'displayName',
              'email',
              'phoneE164',
              'searchName',
              'origin',
            ],
            'properties': <String, Object?>{
              'displayName': <String, Object?>{
                'type': <Object?>[
                  'string',
                  'null',
                ],
                'maxLength': 160,
              },
              'email': <String, Object?>{
                'type': <Object?>[
                  'string',
                  'null',
                ],
                'format': 'email',
                'maxLength': 320,
              },
              'phoneE164': <String, Object?>{
                'type': <Object?>[
                  'string',
                  'null',
                ],
                'pattern': '^\\+[1-9][0-9]{7,14}\$',
              },
              'searchName': <String, Object?>{
                'type': <Object?>[
                  'string',
                  'null',
                ],
                'maxLength': 160,
              },
              'origin': <String, Object?>{
                'type': 'string',
                'enum': <Object?>[
                  'anonymous',
                  'respondentGranted',
                  'organizerAcquired',
                ],
              },
            },
          },
          'sourceLinkId': <String, Object?>{
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
          'sourceLabel': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
            'maxLength': 120,
          },
          'submittedAtMillis': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
            'maximum': 9007199254740991,
          },
          'withdrawnAtMillis': <String, Object?>{
            'type': <Object?>[
              'integer',
              'null',
            ],
            'minimum': 0,
            'maximum': 9007199254740991,
          },
          'highlights': <String, Object?>{
            'type': 'array',
            'maxItems': 12,
            'items': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'questionId',
                'label',
                'answer',
              ],
              'properties': <String, Object?>{
                'questionId': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 180,
                },
                'label': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 240,
                },
                'answer': <String, Object?>{
                  'anyOf': <Object?>[
                    <String, Object?>{
                      'type': 'string',
                      'maxLength': 10000,
                    },
                    <String, Object?>{
                      'type': 'number',
                      'minimum': -1000000000,
                      'maximum': 1000000000,
                    },
                    <String, Object?>{
                      'type': 'boolean',
                    },
                    <String, Object?>{
                      'type': 'null',
                    },
                    <String, Object?>{
                      'type': 'array',
                      'maxItems': 100,
                      'uniqueItems': true,
                      'items': <String, Object?>{
                        'type': 'string',
                        'maxLength': 500,
                      },
                    },
                  ],
                },
              },
            },
          },
          'conversionKinds': <String, Object?>{
            'type': 'array',
            'maxItems': 4,
            'uniqueItems': true,
            'items': <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'crmContact',
                'application',
                'eventAttendeeProposal',
                'followUp',
              ],
            },
          },
        },
      },
    },
    'answerFilterOptions': <String, Object?>{
      'type': 'array',
      'maxItems': 100,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'questionId',
          'label',
          'options',
        ],
        'properties': <String, Object?>{
          'questionId': <String, Object?>{
            'type': 'string',
          },
          'label': <String, Object?>{
            'type': 'string',
          },
          'options': <String, Object?>{
            'type': 'array',
            'items': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'value',
                'label',
              ],
              'properties': <String, Object?>{
                'value': <String, Object?>{
                  'type': 'string',
                },
                'label': <String, Object?>{
                  'type': 'string',
                },
              },
            },
          },
        },
      },
    },
    'nextCursor': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 1000,
    },
    'entries': <String, Object?>{
      'type': 'array',
      'maxItems': 100,
      'description': 'Present only when includeApplications is true. A converted native response has both source summaries and occurs once.',
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'entryId',
          'submittedAtMillis',
          'response',
          'application',
        ],
        'properties': <String, Object?>{
          'entryId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 200,
          },
          'submittedAtMillis': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
          },
          'response': <String, Object?>{
            'anyOf': <Object?>[
              <String, Object?>{
                'type': 'object',
                'additionalProperties': false,
                'required': <Object?>[
                  'responseId',
                  'formId',
                  'formTitle',
                  'versionId',
                  'version',
                  'status',
                  'identityKind',
                  'identity',
                  'sourceLinkId',
                  'sourceLabel',
                  'submittedAtMillis',
                  'withdrawnAtMillis',
                  'highlights',
                  'conversionKinds',
                ],
                'properties': <String, Object?>{
                  'responseId': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                    'maxLength': 180,
                  },
                  'formId': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                    'maxLength': 180,
                  },
                  'formTitle': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                    'maxLength': 160,
                  },
                  'versionId': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                    'maxLength': 180,
                  },
                  'version': <String, Object?>{
                    'type': 'integer',
                    'minimum': 1,
                    'maximum': 1000000,
                  },
                  'status': <String, Object?>{
                    'type': 'string',
                    'enum': <Object?>[
                      'submitted',
                      'withdrawn',
                    ],
                  },
                  'identityKind': <String, Object?>{
                    'type': 'string',
                    'enum': <Object?>[
                      'anonymous',
                      'emailVerified',
                      'phoneVerified',
                      'catchAccount',
                    ],
                  },
                  'identity': <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'displayName',
                      'email',
                      'phoneE164',
                      'searchName',
                      'origin',
                    ],
                    'properties': <String, Object?>{
                      'displayName': <String, Object?>{
                        'type': <Object?>[
                          'string',
                          'null',
                        ],
                        'maxLength': 160,
                      },
                      'email': <String, Object?>{
                        'type': <Object?>[
                          'string',
                          'null',
                        ],
                        'format': 'email',
                        'maxLength': 320,
                      },
                      'phoneE164': <String, Object?>{
                        'type': <Object?>[
                          'string',
                          'null',
                        ],
                        'pattern': '^\\+[1-9][0-9]{7,14}\$',
                      },
                      'searchName': <String, Object?>{
                        'type': <Object?>[
                          'string',
                          'null',
                        ],
                        'maxLength': 160,
                      },
                      'origin': <String, Object?>{
                        'type': 'string',
                        'enum': <Object?>[
                          'anonymous',
                          'respondentGranted',
                          'organizerAcquired',
                        ],
                      },
                    },
                  },
                  'sourceLinkId': <String, Object?>{
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
                  'sourceLabel': <String, Object?>{
                    'type': <Object?>[
                      'string',
                      'null',
                    ],
                    'maxLength': 120,
                  },
                  'submittedAtMillis': <String, Object?>{
                    'type': 'integer',
                    'minimum': 0,
                    'maximum': 9007199254740991,
                  },
                  'withdrawnAtMillis': <String, Object?>{
                    'type': <Object?>[
                      'integer',
                      'null',
                    ],
                    'minimum': 0,
                    'maximum': 9007199254740991,
                  },
                  'highlights': <String, Object?>{
                    'type': 'array',
                    'maxItems': 12,
                    'items': <String, Object?>{
                      'type': 'object',
                      'additionalProperties': false,
                      'required': <Object?>[
                        'questionId',
                        'label',
                        'answer',
                      ],
                      'properties': <String, Object?>{
                        'questionId': <String, Object?>{
                          'type': 'string',
                          'minLength': 1,
                          'maxLength': 180,
                        },
                        'label': <String, Object?>{
                          'type': 'string',
                          'minLength': 1,
                          'maxLength': 240,
                        },
                        'answer': <String, Object?>{
                          'anyOf': <Object?>[
                            <String, Object?>{
                              'type': 'string',
                              'maxLength': 10000,
                            },
                            <String, Object?>{
                              'type': 'number',
                              'minimum': -1000000000,
                              'maximum': 1000000000,
                            },
                            <String, Object?>{
                              'type': 'boolean',
                            },
                            <String, Object?>{
                              'type': 'null',
                            },
                            <String, Object?>{
                              'type': 'array',
                              'maxItems': 100,
                              'uniqueItems': true,
                              'items': <String, Object?>{
                                'type': 'string',
                                'maxLength': 500,
                              },
                            },
                          ],
                        },
                      },
                    },
                  },
                  'conversionKinds': <String, Object?>{
                    'type': 'array',
                    'maxItems': 4,
                    'uniqueItems': true,
                    'items': <String, Object?>{
                      'type': 'string',
                      'enum': <Object?>[
                        'crmContact',
                        'application',
                        'eventAttendeeProposal',
                        'followUp',
                      ],
                    },
                  },
                },
              },
              <String, Object?>{
                'type': 'null',
              },
            ],
          },
          'application': <String, Object?>{
            'anyOf': <Object?>[
              <String, Object?>{
                'type': 'object',
                'additionalProperties': false,
                'required': <Object?>[
                  'applicationId',
                  'formId',
                  'formVersionId',
                  'targetKind',
                  'targetId',
                  'applicantDisplayName',
                  'reviewStatus',
                  'dataAccessState',
                  'sourceKind',
                  'providerId',
                  'submittedAtMillis',
                  'revision',
                ],
                'properties': <String, Object?>{
                  'applicationId': <String, Object?>{
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
                  'applicantDisplayName': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                    'maxLength': 160,
                  },
                  'reviewStatus': <String, Object?>{
                    'type': 'string',
                    'enum': <Object?>[
                      'submitted',
                      'inReview',
                      'approved',
                      'waitlisted',
                      'declined',
                      'withdrawn',
                    ],
                  },
                  'dataAccessState': <String, Object?>{
                    'type': 'string',
                    'enum': <Object?>[
                      'organizerImported',
                      'activeParticipantGrant',
                      'revokedParticipantGrant',
                      'submittedFormResponse',
                    ],
                  },
                  'sourceKind': <String, Object?>{
                    'type': 'string',
                    'enum': <Object?>[
                      'native',
                      'tabularImport',
                      'connector',
                    ],
                  },
                  'providerId': <String, Object?>{
                    'type': <Object?>[
                      'string',
                      'null',
                    ],
                    'minLength': 1,
                    'maxLength': 80,
                  },
                  'submittedAtMillis': <String, Object?>{
                    'type': 'integer',
                    'minimum': 0,
                  },
                  'revision': <String, Object?>{
                    'type': 'integer',
                    'minimum': 1,
                    'maximum': 9007199254740991,
                  },
                  'contactId': <String, Object?>{
                    'type': <Object?>[
                      'string',
                      'null',
                    ],
                    'minLength': 1,
                    'maxLength': 180,
                  },
                  'sourceResponseId': <String, Object?>{
                    'type': <Object?>[
                      'string',
                      'null',
                    ],
                    'minLength': 1,
                    'maxLength': 180,
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
    },
  },
};
