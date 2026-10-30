// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from operations/program_delivery_message_intent.schema.json.

const schemaProgramDeliveryMessageIntentSchema = <String, Object?>{
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'schemaVersion',
    'intentId',
    'revision',
    'context',
    'programId',
    'recipient',
    'workflow',
    'createdAt',
    'expiresAt',
    'permittedRoutes',
    'deliveryPolicy',
    'kind',
    'title',
    'body',
    'instructionRevision',
  ],
  'properties': <String, Object?>{
    'schemaVersion': <String, Object?>{
      'const': 1,
      'type': 'integer',
    },
    'intentId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 160,
      'pattern': '^[a-zA-Z0-9][a-zA-Z0-9._:-]*\$',
    },
    'revision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 1000000,
    },
    'context': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'mode',
        'programId',
        'organizerId',
      ],
      'properties': <String, Object?>{
        'mode': <String, Object?>{
          'type': 'string',
          'const': 'live',
        },
        'programId': <String, Object?>{
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
    'programId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 160,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'recipient': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'kind',
        'recipientKey',
      ],
      'properties': <String, Object?>{
        'kind': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'guest',
            'household',
            'staff',
          ],
        },
        'recipientKey': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 2000,
          'description': 'Stable recipient identity inside the program (guest id, household id, or staff uid). Endpoint resolution lives in the facts reader, never in the intent.',
        },
      },
    },
    'workflow': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'kind',
        'momentId',
        'runId',
      ],
      'properties': <String, Object?>{
        'kind': <String, Object?>{
          'type': 'string',
          'const': 'programMoment',
        },
        'momentId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'runId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 2000,
          'description': 'Moment-run occurrence identity. Phase 3 refines this into an explicit occurrence key once anchor revisions exist.',
        },
      },
    },
    'createdAt': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
    },
    'expiresAt': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
    },
    'permittedRoutes': <String, Object?>{
      'type': 'array',
      'minItems': 1,
      'maxItems': 3,
      'items': <String, Object?>{
        'type': 'string',
        'enum': <Object?>[
          'organizerProgramWhatsapp',
          'catchProgramActivity',
        ],
      },
    },
    'deliveryPolicy': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'maxAttempts',
        'maxAttemptsPerRoute',
        'minimumRetrySeconds',
      ],
      'properties': <String, Object?>{
        'maxAttempts': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
          'maximum': 6,
        },
        'maxAttemptsPerRoute': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
          'maximum': 6,
        },
        'minimumRetrySeconds': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 86400,
        },
      },
    },
    'kind': <String, Object?>{
      'type': 'string',
      'const': 'programReminder',
    },
    'title': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 2000,
    },
    'body': <String, Object?>{
      'type': 'string',
      'minLength': 0,
      'maxLength': 8000,
    },
    'instructionRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
      'description': 'The program/moment fact revision this intent was issued under. Reservation authority expires with it.',
    },
    'whatsapp': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'connectionId',
        'templateId',
        'variables',
      ],
      'properties': <String, Object?>{
        'connectionId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
          'pattern': '^[a-zA-Z0-9][a-zA-Z0-9._:-]*\$',
        },
        'templateId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
          'pattern': '^[a-zA-Z0-9][a-zA-Z0-9._:-]*\$',
        },
        'variables': <String, Object?>{
          'type': 'object',
          'maxProperties': 20,
          'additionalProperties': <String, Object?>{
            'type': 'string',
            'maxLength': 1000,
          },
        },
      },
      'description': 'Approved WhatsApp template content for organizerProgramWhatsapp routes. Frozen at intent time; sender credentials never appear here.',
    },
    'activity': <String, Object?>{
      'description': 'Frozen staff activity and push semantics; claim revalidates the original Moment revision and current recipient authority.',
      'oneOf': <Object?>[
        <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'appRole',
            'audienceDuty',
            'scopeIds',
            'actionKind',
            'notificationType',
            'preferenceKey',
          ],
          'properties': <String, Object?>{
            'appRole': <String, Object?>{
              'type': 'string',
              'const': 'host',
            },
            'audienceDuty': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 160,
            },
            'scopeIds': <String, Object?>{
              'type': <Object?>[
                'array',
                'null',
              ],
              'items': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 160,
              },
              'maxItems': 200,
            },
            'actionKind': <String, Object?>{
              'type': 'string',
              'const': 'push',
            },
            'notificationType': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 160,
            },
            'preferenceKey': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 160,
            },
          },
        },
        <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'appRole',
            'audienceDuty',
            'scopeIds',
            'actionKind',
            'actionDuty',
            'severity',
          ],
          'properties': <String, Object?>{
            'appRole': <String, Object?>{
              'type': 'string',
              'const': 'host',
            },
            'audienceDuty': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 160,
            },
            'scopeIds': <String, Object?>{
              'type': <Object?>[
                'array',
                'null',
              ],
              'items': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 160,
              },
              'maxItems': 200,
            },
            'actionKind': <String, Object?>{
              'type': 'string',
              'const': 'staffAttention',
            },
            'actionDuty': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 160,
            },
            'severity': <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'info',
                'warning',
                'urgent',
              ],
            },
          },
        },
      ],
    },
  },
  'if': <String, Object?>{
    'required': <Object?>[
      'activity',
    ],
  },
  'then': <String, Object?>{
    'required': <Object?>[
      'activity',
    ],
    'properties': <String, Object?>{
      'permittedRoutes': <String, Object?>{
        'minItems': 1,
        'maxItems': 1,
        'items': <String, Object?>{
          'const': 'catchProgramActivity',
        },
      },
      'recipient': <String, Object?>{
        'properties': <String, Object?>{
          'kind': <String, Object?>{
            'const': 'staff',
          },
        },
      },
    },
    'not': <String, Object?>{
      'required': <Object?>[
        'whatsapp',
      ],
    },
  },
  'else': <String, Object?>{
    'properties': <String, Object?>{
      'body': <String, Object?>{
        'minLength': 1,
      },
    },
  },
  'title': 'ProgramDeliveryMessageIntent',
};
