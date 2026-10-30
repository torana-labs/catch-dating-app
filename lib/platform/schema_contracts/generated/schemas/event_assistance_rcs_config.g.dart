// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from operations/event_assistance_rcs_config.schema.json.

const schemaEventAssistanceRcsConfigSchema = <String, Object?>{
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'schemaVersion',
    'senderId',
    'revision',
    'provider',
    'senderIdentity',
    'agentId',
    'region',
    'status',
    'credentialVersion',
    'recipientPrefixes',
    'activation',
    'quote',
    'maxQueueSeconds',
    'allowedPurposes',
    'displayName',
  ],
  'properties': <String, Object?>{
    'schemaVersion': <String, Object?>{
      'type': 'integer',
      'const': 1,
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
      'const': 'googleRbm',
    },
    'senderIdentity': <String, Object?>{
      'type': 'string',
      'const': 'catchPlatform',
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
    'status': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'inactive',
        'ready',
        'paused',
      ],
    },
    'credentialVersion': <String, Object?>{
      'type': 'string',
      'maxLength': 240,
      'pattern': '^projects/[A-Za-z0-9-]+/secrets/[A-Za-z0-9_-]+/versions/[1-9][0-9]*\$',
    },
    'recipientPrefixes': <String, Object?>{
      'type': 'array',
      'minItems': 1,
      'maxItems': 20,
      'uniqueItems': true,
      'items': <String, Object?>{
        'type': 'string',
        'pattern': '^\\+[1-9][0-9]{0,3}\$',
      },
    },
    'activation': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'approvalId',
        'approvedAt',
        'validUntil',
      ],
      'properties': <String, Object?>{
        'approvalId': <String, Object?>{
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
    'quote': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'revision',
        'currency',
        'maxMicrosPerMessage',
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
          'pattern': '^[A-Z]{3}\$',
        },
        'maxMicrosPerMessage': <String, Object?>{
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
    'maxQueueSeconds': <String, Object?>{
      'type': 'integer',
      'minimum': 10,
      'maximum': 3600,
    },
    'allowedPurposes': <String, Object?>{
      'type': 'array',
      'minItems': 1,
      'maxItems': 9,
      'uniqueItems': true,
      'items': <String, Object?>{
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
    },
    'displayName': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 160,
    },
  },
  'title': 'EventAssistanceRcsConfig',
};
