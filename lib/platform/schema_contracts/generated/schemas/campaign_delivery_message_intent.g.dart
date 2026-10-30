// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from operations/campaign_delivery_message_intent.schema.json.

const schemaCampaignDeliveryMessageIntentSchema = <String, Object?>{
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'schemaVersion',
    'intentId',
    'revision',
    'context',
    'campaignId',
    'recipient',
    'workflow',
    'createdAt',
    'expiresAt',
    'permittedRoutes',
    'deliveryPolicy',
    'kind',
    'instructionRevision',
    'whatsapp',
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
        'organizerId',
        'campaignId',
        'recipientId',
      ],
      'properties': <String, Object?>{
        'mode': <String, Object?>{
          'type': 'string',
          'const': 'live',
        },
        'organizerId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 2000,
        },
        'campaignId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'recipientId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
      },
    },
    'campaignId': <String, Object?>{
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
            'campaignRecipient',
          ],
        },
        'recipientKey': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 2000,
          'description': 'organizerCampaignRecipients document id — the frozen per-recipient campaign row. Endpoint and consent facts resolve at claim time, never in the intent.',
        },
      },
    },
    'workflow': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'kind',
        'campaignId',
        'recipientId',
      ],
      'properties': <String, Object?>{
        'kind': <String, Object?>{
          'type': 'string',
          'const': 'campaignDispatch',
        },
        'campaignId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'recipientId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
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
      'maxItems': 1,
      'items': <String, Object?>{
        'type': 'string',
        'enum': <Object?>[
          'organizerWhatsappCampaign',
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
      'const': 'campaignMessage',
    },
    'instructionRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
      'description': 'The campaign dispatch epoch (dispatchedAt millis) this intent was issued under. Reservation authority expires when the campaign\'s dispatch epoch changes.',
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
      'description': 'Approved WhatsApp template content frozen from the campaign/recipient snapshot; sender credentials never appear here.',
    },
  },
  'title': 'CampaignDeliveryMessageIntent',
};
