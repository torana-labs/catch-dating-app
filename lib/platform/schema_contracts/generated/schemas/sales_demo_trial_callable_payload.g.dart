// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/sales_demo_trial.schema.json.

const schemaSalesDemoTrialCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/sales_demo_trial.schema.json',
  'title': 'SalesDemoTrialCallablePayloads',
  'description': 'Union of explicit start, exact session read, and bounded synthetic action requests. Auth and App Check are required for every variant.',
  'anyOf': <Object?>[
    <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'invitationId',
        'grantToken',
        'requestId',
      ],
      'properties': <String, Object?>{
        'invitationId': <String, Object?>{
          'type': 'string',
          'pattern': '^[A-Za-z0-9_-]{3,128}\$',
        },
        'grantToken': <String, Object?>{
          'type': 'string',
          'pattern': '^[A-Za-z0-9_-]{43}\$',
        },
        'requestId': <String, Object?>{
          'type': 'string',
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]{7,95}\$',
        },
      },
    },
    <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'sessionId',
        'grantToken',
      ],
      'properties': <String, Object?>{
        'sessionId': <String, Object?>{
          'type': 'string',
          'pattern': '^[A-Za-z0-9_-]{3,128}\$',
        },
        'grantToken': <String, Object?>{
          'type': 'string',
          'pattern': '^[A-Za-z0-9_-]{43}\$',
        },
      },
    },
    <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'sessionId',
        'grantToken',
        'requestId',
        'expectedRevision',
        'action',
      ],
      'properties': <String, Object?>{
        'sessionId': <String, Object?>{
          'type': 'string',
          'pattern': '^[A-Za-z0-9_-]{3,128}\$',
        },
        'grantToken': <String, Object?>{
          'type': 'string',
          'pattern': '^[A-Za-z0-9_-]{43}\$',
        },
        'requestId': <String, Object?>{
          'type': 'string',
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]{7,95}\$',
        },
        'expectedRevision': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
          'maximum': 1000000,
        },
        'action': <String, Object?>{
          'enum': <Object?>[
            'reviewApplication',
            'prepareReply',
            'admitGuest',
            'requestAssistance',
          ],
        },
        'choice': <String, Object?>{
          'enum': <Object?>[
            'approve',
            'needs_info',
            'welcome',
            'clarify',
          ],
        },
      },
    },
  ],
  'definitions': <String, Object?>{
    'id': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9_-]{3,128}\$',
    },
    'requestId': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]{7,95}\$',
    },
    'grantToken': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9_-]{43}\$',
    },
    'start': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'invitationId',
        'grantToken',
        'requestId',
      ],
      'properties': <String, Object?>{
        'invitationId': <String, Object?>{
          'type': 'string',
          'pattern': '^[A-Za-z0-9_-]{3,128}\$',
        },
        'grantToken': <String, Object?>{
          'type': 'string',
          'pattern': '^[A-Za-z0-9_-]{43}\$',
        },
        'requestId': <String, Object?>{
          'type': 'string',
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]{7,95}\$',
        },
      },
    },
    'get': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'sessionId',
        'grantToken',
      ],
      'properties': <String, Object?>{
        'sessionId': <String, Object?>{
          'type': 'string',
          'pattern': '^[A-Za-z0-9_-]{3,128}\$',
        },
        'grantToken': <String, Object?>{
          'type': 'string',
          'pattern': '^[A-Za-z0-9_-]{43}\$',
        },
      },
    },
    'advance': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'sessionId',
        'grantToken',
        'requestId',
        'expectedRevision',
        'action',
      ],
      'properties': <String, Object?>{
        'sessionId': <String, Object?>{
          'type': 'string',
          'pattern': '^[A-Za-z0-9_-]{3,128}\$',
        },
        'grantToken': <String, Object?>{
          'type': 'string',
          'pattern': '^[A-Za-z0-9_-]{43}\$',
        },
        'requestId': <String, Object?>{
          'type': 'string',
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]{7,95}\$',
        },
        'expectedRevision': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
          'maximum': 1000000,
        },
        'action': <String, Object?>{
          'enum': <Object?>[
            'reviewApplication',
            'prepareReply',
            'admitGuest',
            'requestAssistance',
          ],
        },
        'choice': <String, Object?>{
          'enum': <Object?>[
            'approve',
            'needs_info',
            'welcome',
            'clarify',
          ],
        },
      },
    },
  },
  'x-callables': <Object?>[
    'startSalesDemo',
    'getSalesDemoSession',
    'advanceSalesDemo',
  ],
};
