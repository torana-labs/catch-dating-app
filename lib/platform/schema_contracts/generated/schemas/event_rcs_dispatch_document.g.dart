// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/event_assistance_rcs_dispatches.schema.json.

const schemaEventRcsDispatchDocumentSchema = <String, Object?>{
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'schemaVersion',
    'attemptId',
    'messageId',
    'context',
    'senderId',
    'agentId',
    'region',
    'bindingRevision',
    'configHash',
    'permissionId',
    'permissionRevision',
    'permissionHash',
    'recipientEndpointId',
    'endpointHash',
    'capability',
    'grantId',
    'guestGrantHash',
    'payloadHash',
    'authorityHash',
    'providerMessageId',
    'expiresAt',
    'createdAt',
    'quoteRevision',
    'currency',
    'maxCostMicros',
    'budgetDebits',
    'attendeeId',
    'intentHash',
    'attemptScopeHash',
    'replyBinding',
  ],
  'properties': <String, Object?>{
    'schemaVersion': <String, Object?>{
      'type': 'integer',
      'const': 1,
    },
    'attemptId': <String, Object?>{
      'type': 'string',
      'pattern': '^attempt:[a-f0-9]{64}\$',
    },
    'messageId': <String, Object?>{
      'type': 'string',
      'pattern': '^outbox:[a-f0-9]{64}\$',
    },
    'context': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'mode',
        'organizerId',
        'eventId',
      ],
      'properties': <String, Object?>{
        'mode': <String, Object?>{
          'type': 'string',
          'const': 'live',
        },
        'organizerId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'eventId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
      },
    },
    'senderId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 160,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'agentId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 512,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._@-]*\$',
    },
    'region': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'asia',
        'europe',
        'us',
      ],
    },
    'bindingRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
    },
    'configHash': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
    'permissionId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 160,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'permissionRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
    },
    'permissionHash': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
    'recipientEndpointId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 160,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'endpointHash': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
    'capability': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'requestId',
        'senderId',
        'agentId',
        'recipientEndpointId',
        'configHash',
        'permissionHash',
        'checkedAt',
        'validUntil',
        'supportsOpenUrl',
      ],
      'properties': <String, Object?>{
        'requestId': <String, Object?>{
          'type': 'string',
          'pattern': '^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}\$',
        },
        'senderId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'agentId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 512,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._@-]*\$',
        },
        'recipientEndpointId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'configHash': <String, Object?>{
          'type': 'string',
          'pattern': '^[a-f0-9]{64}\$',
        },
        'permissionHash': <String, Object?>{
          'type': 'string',
          'pattern': '^[a-f0-9]{64}\$',
        },
        'checkedAt': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 9007199254740991,
        },
        'validUntil': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 9007199254740991,
        },
        'supportsOpenUrl': <String, Object?>{
          'type': 'boolean',
        },
      },
    },
    'grantId': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{32}\$',
    },
    'guestGrantHash': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
    'payloadHash': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
    'authorityHash': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
    'providerMessageId': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}\$',
    },
    'expiresAt': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
    },
    'createdAt': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
    },
    'quoteRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
    },
    'currency': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Z]{3}\$',
    },
    'maxCostMicros': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 1000000000,
    },
    'budgetDebits': <String, Object?>{
      'type': 'array',
      'minItems': 2,
      'maxItems': 2,
      'uniqueItems': true,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'budgetId',
          'approvalId',
          'revisionBefore',
          'revisionAfter',
          'chargedBeforeMicros',
          'chargedAfterMicros',
        ],
        'properties': <String, Object?>{
          'budgetId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 160,
            'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
          },
          'approvalId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 160,
            'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
          },
          'revisionBefore': <String, Object?>{
            'type': 'integer',
            'minimum': 1,
            'maximum': 9007199254740991,
          },
          'revisionAfter': <String, Object?>{
            'type': 'integer',
            'minimum': 1,
            'maximum': 9007199254740991,
          },
          'chargedBeforeMicros': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
            'maximum': 9007199254740991,
          },
          'chargedAfterMicros': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
            'maximum': 9007199254740991,
          },
        },
      },
    },
    'attendeeId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 160,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'intentHash': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
    'attemptScopeHash': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
    'replyBinding': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'null',
        },
        <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'guestId',
            'episodeId',
            'guestRevision',
            'attendeeGeneration',
            'sourceGeneration',
            'subjectUid',
            'expiresAt',
            'choices',
          ],
          'properties': <String, Object?>{
            'guestId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 160,
              'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
            },
            'episodeId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 160,
              'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
            },
            'guestRevision': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 9007199254740991,
            },
            'attendeeGeneration': <String, Object?>{
              'type': 'string',
              'pattern': '^[a-f0-9]{64}\$',
            },
            'sourceGeneration': <String, Object?>{
              'type': 'string',
              'pattern': '^[a-f0-9]{64}\$',
            },
            'subjectUid': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 160,
              'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
            },
            'expiresAt': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 9007199254740991,
            },
            'choices': <String, Object?>{
              'type': 'array',
              'minItems': 1,
              'maxItems': 10,
              'uniqueItems': true,
              'items': <String, Object?>{
                'type': 'object',
                'additionalProperties': false,
                'required': <Object?>[
                  'index',
                  'choiceId',
                ],
                'properties': <String, Object?>{
                  'index': <String, Object?>{
                    'type': 'integer',
                    'minimum': 0,
                    'maximum': 9,
                  },
                  'choiceId': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                    'maxLength': 160,
                    'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                  },
                },
              },
            },
            'recipientBinding': <String, Object?>{
              'type': 'object',
              'oneOf': <Object?>[
                <String, Object?>{
                  'type': 'object',
                  'additionalProperties': false,
                  'required': <Object?>[
                    'kind',
                    'subjectUid',
                    'sourceGeneration',
                  ],
                  'properties': <String, Object?>{
                    'kind': <String, Object?>{
                      'type': 'string',
                      'const': 'rosterPhone',
                    },
                    'subjectUid': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 128,
                      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                    },
                    'sourceGeneration': <String, Object?>{
                      'type': 'string',
                      'pattern': '^[a-f0-9]{64}\$',
                    },
                  },
                },
                <String, Object?>{
                  'type': 'object',
                  'additionalProperties': false,
                  'required': <Object?>[
                    'kind',
                    'subjectUid',
                    'sourceGeneration',
                  ],
                  'properties': <String, Object?>{
                    'kind': <String, Object?>{
                      'type': 'string',
                      'const': 'privateVerifiedPhone',
                    },
                    'subjectUid': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 128,
                      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                    },
                    'sourceGeneration': <String, Object?>{
                      'type': 'string',
                      'pattern': '^[a-f0-9]{64}\$',
                    },
                  },
                },
              ],
            },
          },
        },
      ],
    },
  },
  'title': 'EventRcsDispatchDocument',
  'x-firestore-collection': 'eventAssistanceRcsDispatches',
  'x-firestore-path': 'eventAssistanceRcsDispatches/{attemptId}',
  'x-document-id-field': 'attemptId',
  'x-owner': 'event-service RCS dispatch',
};
