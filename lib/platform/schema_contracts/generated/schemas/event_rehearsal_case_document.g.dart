// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/event_rehearsal_cases.schema.json.

const schemaEventRehearsalCaseDocumentSchema = <String, Object?>{
  'oneOf': <Object?>[
    <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'caseId',
        'sessionId',
        'actorId',
        'clockId',
        'source',
        'category',
        'receivedAt',
        'status',
        'handling',
      ],
      'properties': <String, Object?>{
        'caseId': <String, Object?>{
          'type': 'string',
          'pattern': '^practice-case:[a-f0-9]{64}\$',
          'x-catch-ownership': 'server-only',
        },
        'sessionId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
          'x-catch-ownership': 'server-only',
        },
        'actorId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
          'x-catch-ownership': 'server-only',
        },
        'clockId': <String, Object?>{
          'type': 'string',
          'pattern': '^clock:[a-f0-9]{64}\$',
          'x-catch-ownership': 'server-only',
        },
        'source': <String, Object?>{
          'oneOf': <Object?>[
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'kind',
                'actionId',
              ],
              'properties': <String, Object?>{
                'kind': <String, Object?>{
                  'const': 'guestAction',
                },
                'actionId': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 180,
                  'x-catch-ownership': 'server-only',
                },
              },
            },
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'kind',
                'messageId',
                'responseId',
              ],
              'properties': <String, Object?>{
                'kind': <String, Object?>{
                  'const': 'messageResponse',
                },
                'messageId': <String, Object?>{
                  'type': 'string',
                  'pattern': '^outbox:[a-f0-9]{64}\$',
                },
                'responseId': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 180,
                  'x-catch-ownership': 'server-only',
                },
              },
            },
          ],
          'x-catch-ownership': 'server-only',
        },
        'category': <String, Object?>{
          'enum': <Object?>[
            'eventLogistics',
            'accessibility',
            'other',
          ],
          'x-catch-ownership': 'server-only',
        },
        'receivedAt': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 9007199254740991,
          'x-catch-ownership': 'server-only',
        },
        'status': <String, Object?>{
          'const': 'open',
          'x-catch-ownership': 'server-only',
        },
        'handling': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'revision',
            'assigneeUid',
            'updatedAt',
            'resolution',
          ],
          'properties': <String, Object?>{
            'revision': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 9007199254740991,
            },
            'assigneeUid': <String, Object?>{
              'anyOf': <Object?>[
                <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 160,
                  'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                },
                <String, Object?>{
                  'type': 'null',
                },
              ],
            },
            'updatedAt': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 9007199254740991,
            },
            'resolution': <String, Object?>{
              'type': 'null',
            },
          },
          'x-catch-ownership': 'server-only',
        },
      },
    },
    <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'caseId',
        'sessionId',
        'actorId',
        'clockId',
        'source',
        'category',
        'receivedAt',
        'status',
        'handling',
      ],
      'properties': <String, Object?>{
        'caseId': <String, Object?>{
          'type': 'string',
          'pattern': '^practice-case:[a-f0-9]{64}\$',
          'x-catch-ownership': 'server-only',
        },
        'sessionId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
          'x-catch-ownership': 'server-only',
        },
        'actorId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
          'x-catch-ownership': 'server-only',
        },
        'clockId': <String, Object?>{
          'type': 'string',
          'pattern': '^clock:[a-f0-9]{64}\$',
          'x-catch-ownership': 'server-only',
        },
        'source': <String, Object?>{
          'oneOf': <Object?>[
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'kind',
                'actionId',
              ],
              'properties': <String, Object?>{
                'kind': <String, Object?>{
                  'const': 'guestAction',
                },
                'actionId': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 180,
                  'x-catch-ownership': 'server-only',
                },
              },
            },
            <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'kind',
                'messageId',
                'responseId',
              ],
              'properties': <String, Object?>{
                'kind': <String, Object?>{
                  'const': 'messageResponse',
                },
                'messageId': <String, Object?>{
                  'type': 'string',
                  'pattern': '^outbox:[a-f0-9]{64}\$',
                },
                'responseId': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 180,
                  'x-catch-ownership': 'server-only',
                },
              },
            },
          ],
          'x-catch-ownership': 'server-only',
        },
        'category': <String, Object?>{
          'enum': <Object?>[
            'eventLogistics',
            'accessibility',
            'other',
          ],
          'x-catch-ownership': 'server-only',
        },
        'receivedAt': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 9007199254740991,
          'x-catch-ownership': 'server-only',
        },
        'status': <String, Object?>{
          'const': 'resolved',
          'x-catch-ownership': 'server-only',
        },
        'handling': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'revision',
            'assigneeUid',
            'updatedAt',
            'resolution',
          ],
          'properties': <String, Object?>{
            'revision': <String, Object?>{
              'type': 'integer',
              'minimum': 1,
              'maximum': 9007199254740991,
            },
            'assigneeUid': <String, Object?>{
              'anyOf': <Object?>[
                <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 160,
                  'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                },
                <String, Object?>{
                  'type': 'null',
                },
              ],
            },
            'updatedAt': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 9007199254740991,
            },
            'resolution': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'outcome',
                'actorUid',
                'at',
              ],
              'properties': <String, Object?>{
                'outcome': <String, Object?>{
                  'enum': <Object?>[
                    'resolved',
                    'declined',
                  ],
                },
                'actorUid': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 160,
                  'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                },
                'at': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                  'maximum': 9007199254740991,
                },
              },
            },
          },
          'x-catch-ownership': 'server-only',
        },
      },
    },
  ],
  'title': 'EventRehearsalCaseDocument',
  'description': 'Synthetic practical help requests, retained until rehearsal reset or expiry. No live guest or safety case is written.',
  'x-firestore-collection': 'eventRehearsalCases',
  'x-firestore-path': 'eventRehearsalCases/{caseId}',
  'x-document-id-field': 'caseId',
  'x-owner': 'event rehearsal callables',
};
