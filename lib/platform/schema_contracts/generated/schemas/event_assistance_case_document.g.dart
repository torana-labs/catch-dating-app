// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/event_assistance_cases.schema.json.

const schemaEventAssistanceCaseDocumentSchema = <String, Object?>{
  'oneOf': <Object?>[
    <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'schemaVersion',
        'caseId',
        'guestId',
        'context',
        'attendeeId',
        'episodeId',
        'responseId',
        'messageId',
        'status',
        'receivedAt',
        'category',
        'owner',
      ],
      'properties': <String, Object?>{
        'schemaVersion': <String, Object?>{
          'const': 1,
        },
        'caseId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'guestId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'context': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'mode',
            'eventId',
            'organizerId',
          ],
          'properties': <String, Object?>{
            'mode': <String, Object?>{
              'type': 'string',
              'const': 'live',
            },
            'eventId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 160,
              'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
            },
            'organizerId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 2000,
            },
          },
        },
        'attendeeId': <String, Object?>{
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
        'responseId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'messageId': <String, Object?>{
          'type': 'string',
          'pattern': '^outbox:[a-f0-9]{64}\$',
        },
        'status': <String, Object?>{
          'enum': <Object?>[
            'open',
            'resolved',
          ],
        },
        'receivedAt': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 9007199254740991,
        },
        'category': <String, Object?>{
          'enum': <Object?>[
            'eventLogistics',
            'accessibility',
            'other',
          ],
        },
        'owner': <String, Object?>{
          'const': 'eventLead',
        },
      },
    },
    <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'schemaVersion',
        'caseId',
        'guestId',
        'context',
        'attendeeId',
        'episodeId',
        'responseId',
        'messageId',
        'status',
        'receivedAt',
        'category',
        'owner',
        'sourceGeneration',
        'handling',
        'attendeeGeneration',
      ],
      'properties': <String, Object?>{
        'schemaVersion': <String, Object?>{
          'const': 1,
        },
        'caseId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'guestId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'context': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'mode',
            'eventId',
            'organizerId',
          ],
          'properties': <String, Object?>{
            'mode': <String, Object?>{
              'type': 'string',
              'const': 'live',
            },
            'eventId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 160,
              'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
            },
            'organizerId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 2000,
            },
          },
        },
        'attendeeId': <String, Object?>{
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
        'responseId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'messageId': <String, Object?>{
          'type': 'string',
          'pattern': '^outbox:[a-f0-9]{64}\$',
        },
        'status': <String, Object?>{
          'const': 'open',
        },
        'receivedAt': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 9007199254740991,
        },
        'category': <String, Object?>{
          'enum': <Object?>[
            'eventLogistics',
            'accessibility',
            'other',
          ],
        },
        'owner': <String, Object?>{
          'const': 'eventLead',
        },
        'sourceGeneration': <String, Object?>{
          'type': 'string',
          'pattern': '^[a-f0-9]{64}\$',
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
        },
        'attendeeGeneration': <String, Object?>{
          'type': 'string',
          'pattern': '^[a-f0-9]{64}\$',
        },
      },
    },
    <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'schemaVersion',
        'caseId',
        'guestId',
        'context',
        'attendeeId',
        'episodeId',
        'responseId',
        'messageId',
        'status',
        'receivedAt',
        'category',
        'owner',
        'sourceGeneration',
        'handling',
        'attendeeGeneration',
      ],
      'properties': <String, Object?>{
        'schemaVersion': <String, Object?>{
          'const': 1,
        },
        'caseId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'guestId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'context': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'mode',
            'eventId',
            'organizerId',
          ],
          'properties': <String, Object?>{
            'mode': <String, Object?>{
              'type': 'string',
              'const': 'live',
            },
            'eventId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 160,
              'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
            },
            'organizerId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 2000,
            },
          },
        },
        'attendeeId': <String, Object?>{
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
        'responseId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'messageId': <String, Object?>{
          'type': 'string',
          'pattern': '^outbox:[a-f0-9]{64}\$',
        },
        'status': <String, Object?>{
          'const': 'resolved',
        },
        'receivedAt': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 9007199254740991,
        },
        'category': <String, Object?>{
          'enum': <Object?>[
            'eventLogistics',
            'accessibility',
            'other',
          ],
        },
        'owner': <String, Object?>{
          'const': 'eventLead',
        },
        'sourceGeneration': <String, Object?>{
          'type': 'string',
          'pattern': '^[a-f0-9]{64}\$',
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
        },
        'attendeeGeneration': <String, Object?>{
          'type': 'string',
          'pattern': '^[a-f0-9]{64}\$',
        },
      },
    },
    <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'schemaVersion',
        'caseId',
        'guestId',
        'context',
        'attendeeId',
        'episodeId',
        'responseId',
        'messageId',
        'status',
        'receivedAt',
        'category',
        'owner',
      ],
      'properties': <String, Object?>{
        'schemaVersion': <String, Object?>{
          'const': 1,
        },
        'caseId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'guestId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'context': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'mode',
            'eventId',
            'organizerId',
          ],
          'properties': <String, Object?>{
            'mode': <String, Object?>{
              'type': 'string',
              'const': 'live',
            },
            'eventId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 160,
              'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
            },
            'organizerId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 2000,
            },
          },
        },
        'attendeeId': <String, Object?>{
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
        'responseId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'messageId': <String, Object?>{
          'type': 'string',
          'pattern': '^outbox:[a-f0-9]{64}\$',
        },
        'status': <String, Object?>{
          'enum': <Object?>[
            'open',
            'resolved',
          ],
        },
        'receivedAt': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 9007199254740991,
        },
        'category': <String, Object?>{
          'enum': <Object?>[
            'comfortSafety',
          ],
        },
        'owner': <String, Object?>{
          'const': 'authorizedSafetyOperator',
        },
      },
    },
    <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'schemaVersion',
        'caseId',
        'guestId',
        'context',
        'attendeeId',
        'episodeId',
        'responseId',
        'messageId',
        'status',
        'receivedAt',
        'category',
        'owner',
        'sourceGeneration',
        'handling',
        'attendeeGeneration',
      ],
      'properties': <String, Object?>{
        'schemaVersion': <String, Object?>{
          'const': 1,
        },
        'caseId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'guestId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'context': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'mode',
            'eventId',
            'organizerId',
          ],
          'properties': <String, Object?>{
            'mode': <String, Object?>{
              'type': 'string',
              'const': 'live',
            },
            'eventId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 160,
              'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
            },
            'organizerId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 2000,
            },
          },
        },
        'attendeeId': <String, Object?>{
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
        'responseId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'messageId': <String, Object?>{
          'type': 'string',
          'pattern': '^outbox:[a-f0-9]{64}\$',
        },
        'status': <String, Object?>{
          'const': 'open',
        },
        'receivedAt': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 9007199254740991,
        },
        'category': <String, Object?>{
          'enum': <Object?>[
            'comfortSafety',
          ],
        },
        'owner': <String, Object?>{
          'const': 'authorizedSafetyOperator',
        },
        'sourceGeneration': <String, Object?>{
          'type': 'string',
          'pattern': '^[a-f0-9]{64}\$',
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
        },
        'attendeeGeneration': <String, Object?>{
          'type': 'string',
          'pattern': '^[a-f0-9]{64}\$',
        },
      },
    },
    <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'schemaVersion',
        'caseId',
        'guestId',
        'context',
        'attendeeId',
        'episodeId',
        'responseId',
        'messageId',
        'status',
        'receivedAt',
        'category',
        'owner',
        'sourceGeneration',
        'handling',
        'attendeeGeneration',
      ],
      'properties': <String, Object?>{
        'schemaVersion': <String, Object?>{
          'const': 1,
        },
        'caseId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'guestId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'context': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'mode',
            'eventId',
            'organizerId',
          ],
          'properties': <String, Object?>{
            'mode': <String, Object?>{
              'type': 'string',
              'const': 'live',
            },
            'eventId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 160,
              'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
            },
            'organizerId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 2000,
            },
          },
        },
        'attendeeId': <String, Object?>{
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
        'responseId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'messageId': <String, Object?>{
          'type': 'string',
          'pattern': '^outbox:[a-f0-9]{64}\$',
        },
        'status': <String, Object?>{
          'const': 'resolved',
        },
        'receivedAt': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 9007199254740991,
        },
        'category': <String, Object?>{
          'enum': <Object?>[
            'comfortSafety',
          ],
        },
        'owner': <String, Object?>{
          'const': 'authorizedSafetyOperator',
        },
        'sourceGeneration': <String, Object?>{
          'type': 'string',
          'pattern': '^[a-f0-9]{64}\$',
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
        },
        'attendeeGeneration': <String, Object?>{
          'type': 'string',
          'pattern': '^[a-f0-9]{64}\$',
        },
      },
    },
  ],
  'title': 'EventAssistanceCaseDocument',
  'x-firestore-collection': 'eventAssistanceCases',
  'x-firestore-path': 'eventAssistanceCases/{caseId}',
  'x-document-id-field': 'caseId',
  'x-owner': 'trusted event-assistance guest boundary',
};
