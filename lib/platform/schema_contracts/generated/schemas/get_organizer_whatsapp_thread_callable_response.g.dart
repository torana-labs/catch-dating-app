// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/get_organizer_whatsapp_thread_response.schema.json.

const schemaGetOrganizerWhatsappThreadCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/get_organizer_whatsapp_thread_response.schema.json',
  'title': 'GetOrganizerWhatsappThreadCallableResponse',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'organizerId',
    'threadId',
    'contactId',
    'displayName',
    'lastInboundAtMillis',
    'serviceWindowExpiresAtMillis',
    'serviceWindowOpen',
    'messages',
    'messagesTruncated',
  ],
  'properties': <String, Object?>{
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'threadId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'contactId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'linkedUid': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 1,
      'maxLength': 128,
      'description': 'Verified current account identity for this organizer contact; absent on older servers and null for unresolved, merged, hidden or deleted identities.',
    },
    'displayName': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 120,
    },
    'lastInboundAtMillis': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
    },
    'serviceWindowExpiresAtMillis': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
    },
    'serviceWindowOpen': <String, Object?>{
      'type': 'boolean',
    },
    'messages': <String, Object?>{
      'type': 'array',
      'maxItems': 200,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'messageId',
          'direction',
          'body',
          'occurredAtMillis',
        ],
        'properties': <String, Object?>{
          'messageId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
          },
          'direction': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'inbound',
              'outbound',
            ],
          },
          'body': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 4096,
          },
          'occurredAtMillis': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
          },
        },
      },
    },
    'messagesTruncated': <String, Object?>{
      'type': 'boolean',
    },
  },
  'definitions': <String, Object?>{
    'message': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'messageId',
        'direction',
        'body',
        'occurredAtMillis',
      ],
      'properties': <String, Object?>{
        'messageId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        'direction': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'inbound',
            'outbound',
          ],
        },
        'body': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 4096,
        },
        'occurredAtMillis': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
        },
      },
    },
  },
};
