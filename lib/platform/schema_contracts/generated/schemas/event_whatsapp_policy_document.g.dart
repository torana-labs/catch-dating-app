// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/event_assistance_whatsapp_policies.schema.json.

const schemaEventWhatsappPolicyDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/event_assistance_whatsapp_policies.schema.json',
  'title': 'EventWhatsappPolicyDocument',
  'description': 'Reviewed event-service template and spend policy for one existing organizer-owned WhatsApp sender. This policy alone grants no guest consent or send authority.',
  'x-firestore-collection': 'eventAssistanceWhatsappPolicies',
  'x-firestore-path': 'eventAssistanceWhatsappPolicies/{senderId}',
  'x-document-id-field': 'senderId',
  'x-owner': 'trusted event-assistance dispatch',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'schemaVersion',
    'senderId',
    'organizerId',
    'revision',
    'status',
    'providerAccountId',
    'providerPhoneNumberId',
    'activation',
    'maxTemplateAgeSeconds',
    'quote',
    'templates',
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
    'organizerId': <String, Object?>{
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
    'maxTemplateAgeSeconds': <String, Object?>{
      'type': 'integer',
      'minimum': 60,
      'maximum': 86400,
    },
    'status': <String, Object?>{
      'enum': <Object?>[
        'inactive',
        'ready',
        'paused',
      ],
      'type': 'string',
    },
    'providerAccountId': <String, Object?>{
      'type': 'string',
      'pattern': '^[0-9]{5,40}\$',
    },
    'providerPhoneNumberId': <String, Object?>{
      'type': 'string',
      'pattern': '^[0-9]{5,40}\$',
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
        'recipientPrefixes',
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
        'recipientPrefixes': <String, Object?>{
          'type': 'array',
          'minItems': 1,
          'maxItems': 250,
          'uniqueItems': true,
          'items': <String, Object?>{
            'type': 'string',
            'pattern': '^\\+[1-9][0-9]{0,3}\$',
          },
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
    'templates': <String, Object?>{
      'type': 'array',
      'minItems': 1,
      'maxItems': 32,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'templateDocumentId',
          'purpose',
          'templateHash',
          'variables',
          'quickReplies',
        ],
        'properties': <String, Object?>{
          'templateDocumentId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 160,
            'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
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
          'templateHash': <String, Object?>{
            'type': 'string',
            'pattern': '^[a-f0-9]{64}\$',
          },
          'variables': <String, Object?>{
            'type': 'array',
            'minItems': 1,
            'maxItems': 20,
            'items': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'providerName',
                'source',
                'maxCharacters',
              ],
              'properties': <String, Object?>{
                'providerName': <String, Object?>{
                  'type': 'string',
                  'pattern': '^[A-Za-z][A-Za-z0-9_]{0,63}\$',
                },
                'source': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'eventTitle',
                    'instruction',
                    'responseUrl',
                    'responseUrlSuffix',
                  ],
                },
                'maxCharacters': <String, Object?>{
                  'type': 'integer',
                  'minimum': 1,
                  'maximum': 4096,
                },
              },
            },
          },
          'quickReplies': <String, Object?>{
            'type': 'array',
            'maxItems': 10,
            'items': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'buttonIndex',
                'choiceId',
                'label',
                'action',
              ],
              'properties': <String, Object?>{
                'buttonIndex': <String, Object?>{
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
                'label': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 80,
                },
                'action': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'onMyWay',
                    'notComing',
                    'joinLater',
                    'helpLogistics',
                    'helpAccessibility',
                    'helpSafety',
                    'helpOther',
                    'acknowledge',
                  ],
                },
              },
            },
          },
        },
      },
    },
  },
  'definitions': <String, Object?>{
    'id': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 160,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'time': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
    },
    'revision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
    },
  },
};
