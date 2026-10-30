// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/event_assistance_whatsapp_reply_bindings.schema.json.

const schemaEventWhatsappReplyBindingDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/event_assistance_whatsapp_reply_bindings.schema.json',
  'title': 'EventWhatsappReplyBindingDocument',
  'description': 'Private immutable choice mapping committed with one live outbox dispatch claim. Native IDs provide correlation, never bearer authentication. A signed queued reply must match the original sender, recipient and confirmed provider message before the shared guest-action transaction can apply its stored choice.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'eventAssistanceWhatsappReplyBindings',
  'x-firestore-path': 'eventAssistanceWhatsappReplyBindings/{attemptId}',
  'x-document-id-field': 'attemptId',
  'x-owner': 'trusted event-assistance WhatsApp dispatch and reply boundary',
  'required': <Object?>[
    'schemaVersion',
    'attemptId',
    'messageId',
    'context',
    'guestId',
    'attendeeId',
    'episodeId',
    'attendeeGeneration',
    'guestRevision',
    'attemptScopeHash',
    'senderId',
    'bindingRevision',
    'providerAccountId',
    'providerPhoneNumberId',
    'recipientEndpointId',
    'endpointHash',
    'replyKind',
    'choices',
    'createdAt',
    'expiresAt',
    'intentHash',
  ],
  'properties': <String, Object?>{
    'schemaVersion': <String, Object?>{
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
    'guestId': <String, Object?>{
      'type': 'string',
      'pattern': '^guest:[a-f0-9]{64}\$',
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
    'attendeeGeneration': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
    'guestRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
    },
    'attemptScopeHash': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
    'senderId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 160,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'bindingRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
    },
    'providerAccountId': <String, Object?>{
      'type': 'string',
      'pattern': '^[0-9]{1,32}\$',
    },
    'providerPhoneNumberId': <String, Object?>{
      'type': 'string',
      'pattern': '^[0-9]{1,32}\$',
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
    'replyKind': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'templateQuickReply',
        'replyButton',
        'listReply',
      ],
    },
    'choices': <String, Object?>{
      'type': 'array',
      'minItems': 1,
      'maxItems': 20,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'nativeId',
          'choiceId',
        ],
        'properties': <String, Object?>{
          'nativeId': <String, Object?>{
            'type': 'string',
            'pattern': '^ce-wa1\\.[a-f0-9]{64}\\.([0-9]|1[0-9])\$',
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
    'intentHash': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
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
};
