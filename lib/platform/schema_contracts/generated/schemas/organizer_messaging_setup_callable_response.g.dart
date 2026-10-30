// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/organizer_messaging_setup_response.schema.json.

const schemaOrganizerMessagingSetupCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/organizer_messaging_setup_response.schema.json',
  'title': 'OrganizerMessagingSetupCallableResponse',
  'description': 'Safe organizer messaging connection and approved-template inventory.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'organizerId',
    'providerConfigured',
    'embeddedSignup',
    'connection',
    'templates',
  ],
  'properties': <String, Object?>{
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'providerConfigured': <String, Object?>{
      'type': 'boolean',
    },
    'embeddedSignup': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'appId',
        'configId',
        'graphVersion',
      ],
      'properties': <String, Object?>{
        'appId': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
        },
        'configId': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
        },
        'graphVersion': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
        },
      },
    },
    'connection': <String, Object?>{
      'type': <Object?>[
        'object',
        'null',
      ],
      'additionalProperties': false,
      'required': <Object?>[
        'connectionId',
        'status',
        'displayPhoneNumber',
        'verifiedName',
        'qualityRating',
        'messagingLimitTier',
        'templateSyncStatus',
        'webhookStatus',
        'testStatus',
        'revision',
      ],
      'properties': <String, Object?>{
        'connectionId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        'status': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'pending',
            'testing',
            'active',
            'degraded',
            'blocked',
            'tokenRevoked',
            'disconnected',
          ],
        },
        'displayPhoneNumber': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
        },
        'verifiedName': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
        },
        'qualityRating': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'enum': <Object?>[
            null,
            'GREEN',
            'YELLOW',
            'RED',
            'UNKNOWN',
          ],
        },
        'messagingLimitTier': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
        },
        'templateSyncStatus': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'notStarted',
            'current',
            'stale',
            'failed',
          ],
        },
        'webhookStatus': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'notSubscribed',
            'subscribed',
            'degraded',
          ],
        },
        'testStatus': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'notSent',
            'pending',
            'delivered',
            'failed',
          ],
        },
        'revision': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
        },
      },
    },
    'templates': <String, Object?>{
      'type': 'array',
      'maxItems': 200,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'templateId',
          'name',
          'language',
          'category',
          'status',
          'variableNames',
          'hasMediaHeader',
          'buttonKinds',
        ],
        'properties': <String, Object?>{
          'templateId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
          },
          'name': <String, Object?>{
            'type': 'string',
          },
          'language': <String, Object?>{
            'type': 'string',
          },
          'category': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'MARKETING',
              'UTILITY',
              'AUTHENTICATION',
              'UNKNOWN',
            ],
          },
          'status': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'APPROVED',
              'PENDING',
              'REJECTED',
              'PAUSED',
              'DISABLED',
              'DELETED',
              'UNKNOWN',
            ],
          },
          'variableNames': <String, Object?>{
            'type': 'array',
            'items': <String, Object?>{
              'type': 'string',
            },
          },
          'hasMediaHeader': <String, Object?>{
            'type': 'boolean',
          },
          'buttonKinds': <String, Object?>{
            'type': 'array',
            'items': <String, Object?>{
              'type': 'string',
            },
          },
        },
      },
    },
  },
};
