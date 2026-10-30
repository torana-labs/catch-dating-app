// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/event_assistance_sms_senders.schema.json.

const schemaEventAssistanceSmsSenderDocumentSchema = <String, Object?>{
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'schemaVersion',
    'senderId',
    'revision',
    'provider',
    'senderIdentity',
    'country',
    'status',
    'mask',
    'principalEntityId',
    'credentialVersion',
    'activation',
    'maxSegments',
    'quote',
    'templates',
  ],
  'properties': <String, Object?>{
    'schemaVersion': <String, Object?>{
      'const': 1,
      'type': 'integer',
    },
    'senderId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 160,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'revision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
    },
    'provider': <String, Object?>{
      'type': 'string',
      'const': 'gupshup',
    },
    'senderIdentity': <String, Object?>{
      'type': 'string',
      'const': 'catchPlatform',
    },
    'country': <String, Object?>{
      'type': 'string',
      'const': 'IN',
    },
    'status': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'inactive',
        'ready',
        'paused',
      ],
    },
    'mask': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z]{6}\$',
    },
    'principalEntityId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 30,
      'pattern': '^[0-9]+\$',
    },
    'credentialVersion': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 240,
      'pattern': '^projects/[A-Za-z0-9-]+/secrets/[A-Za-z0-9_-]+/versions/[1-9][0-9]*\$',
    },
    'activation': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'useCaseApprovalId',
        'senderApprovalId',
        'approvedAt',
        'validUntil',
      ],
      'properties': <String, Object?>{
        'useCaseApprovalId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'senderApprovalId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'approvedAt': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 9007199254740991,
        },
        'validUntil': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 9007199254740991,
        },
      },
    },
    'maxSegments': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 6,
    },
    'quote': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'revision',
        'currency',
        'maxMicrosPerSegment',
        'validUntil',
      ],
      'properties': <String, Object?>{
        'revision': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
          'maximum': 9007199254740991,
        },
        'currency': <String, Object?>{
          'type': 'string',
          'const': 'INR',
        },
        'maxMicrosPerSegment': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
          'maximum': 1000000000,
        },
        'validUntil': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 9007199254740991,
        },
      },
    },
    'templates': <String, Object?>{
      'type': 'array',
      'minItems': 1,
      'maxItems': 32,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'templateId',
          'revision',
          'purpose',
          'dltTemplateId',
          'status',
          'parts',
        ],
        'properties': <String, Object?>{
          'templateId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 160,
            'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
          },
          'revision': <String, Object?>{
            'type': 'integer',
            'minimum': 1,
            'maximum': 9007199254740991,
          },
          'purpose': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'joiningUpdate',
              'joiningInstructions',
              'planChanged',
              'guestRequirement',
              'assignmentChanged',
              'participationCheck',
              'eventCancelled',
              'eventFinished',
              'followUp',
            ],
          },
          'dltTemplateId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 30,
            'pattern': '^[0-9]+\$',
          },
          'status': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'pending',
              'approved',
              'paused',
            ],
          },
          'parts': <String, Object?>{
            'type': 'array',
            'minItems': 1,
            'maxItems': 16,
            'items': <String, Object?>{
              'oneOf': <Object?>[
                <String, Object?>{
                  'type': 'object',
                  'additionalProperties': false,
                  'required': <Object?>[
                    'kind',
                    'text',
                  ],
                  'properties': <String, Object?>{
                    'kind': <String, Object?>{
                      'type': 'string',
                      'const': 'literal',
                    },
                    'text': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 1200,
                    },
                  },
                },
                <String, Object?>{
                  'type': 'object',
                  'additionalProperties': false,
                  'required': <Object?>[
                    'kind',
                    'name',
                    'maxCharacters',
                  ],
                  'properties': <String, Object?>{
                    'kind': <String, Object?>{
                      'type': 'string',
                      'const': 'variable',
                    },
                    'name': <String, Object?>{
                      'type': 'string',
                      'enum': <Object?>[
                        'eventTitle',
                        'instruction',
                        'responseUrl',
                      ],
                    },
                    'maxCharacters': <String, Object?>{
                      'type': 'integer',
                      'minimum': 1,
                      'maximum': 1200,
                    },
                  },
                },
              ],
            },
          },
        },
      },
    },
  },
  'title': 'EventAssistanceSmsSenderDocument',
  'x-firestore-collection': 'eventAssistanceSmsSenders',
  'x-firestore-path': 'eventAssistanceSmsSenders/{senderId}',
  'x-document-id-field': 'senderId',
  'x-owner': 'trusted event-assistance SMS worker',
};
