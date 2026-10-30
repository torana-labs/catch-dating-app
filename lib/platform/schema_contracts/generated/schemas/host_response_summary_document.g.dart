// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/host_response_summaries.schema.json.

const schemaHostResponseSummaryDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/host_response_summaries.schema.json',
  'title': 'HostResponseSummaryDocument',
  'description': 'Server-maintained response inbox metadata. No answer snapshots or asset URLs. Withdrawal atomically redacts a verified view or deletes an invalid view.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'hostResponseSummaries',
  'x-firestore-path': 'hostResponseSummaries/{summaryId}',
  'x-owner': 'Host read model projector',
  'required': <Object?>[
    'organizerId',
    'summaryId',
    'kind',
    'formId',
    'submittedAtMillis',
    'row',
    'version',
  ],
  'properties': <String, Object?>{
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'x-catch-ownership': 'server-only',
    },
    'summaryId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'x-catch-ownership': 'server-only',
    },
    'kind': <String, Object?>{
      'enum': <Object?>[
        'response',
        'application',
      ],
      'x-catch-ownership': 'server-only',
    },
    'formId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'x-catch-ownership': 'server-only',
    },
    'submittedAtMillis': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
      'x-catch-ownership': 'server-only',
    },
    'row': <String, Object?>{
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
      'x-catch-ownership': 'server-only',
    },
    'version': <String, Object?>{
      'const': 1,
      'x-catch-ownership': 'server-only',
    },
  },
};
