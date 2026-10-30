// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/list_organizer_whatsapp_threads_response.schema.json.

const schemaListOrganizerWhatsappThreadsCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/list_organizer_whatsapp_threads_response.schema.json',
  'title': 'ListOrganizerWhatsappThreadsCallableResponse',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'organizerId',
    'threads',
    'nextCursor',
  ],
  'properties': <String, Object?>{
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'threads': <String, Object?>{
      'type': 'array',
      'maxItems': 50,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'threadId',
          'contactId',
          'displayName',
          'eventIds',
          'lastMessageBody',
          'lastMessageDirection',
          'lastMessageAtMillis',
          'lastInboundAtMillis',
          'serviceWindowExpiresAtMillis',
          'serviceWindowOpen',
        ],
        'properties': <String, Object?>{
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
          'eventIds': <String, Object?>{
            'type': 'array',
            'maxItems': 50,
            'uniqueItems': true,
            'items': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 180,
            },
          },
          'lastMessageBody': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 4096,
          },
          'lastMessageDirection': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'inbound',
              'outbound',
            ],
          },
          'lastMessageAtMillis': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
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
        },
      },
    },
    'nextCursor': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 512,
    },
  },
  'definitions': <String, Object?>{
    'thread': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'threadId',
        'contactId',
        'displayName',
        'eventIds',
        'lastMessageBody',
        'lastMessageDirection',
        'lastMessageAtMillis',
        'lastInboundAtMillis',
        'serviceWindowExpiresAtMillis',
        'serviceWindowOpen',
      ],
      'properties': <String, Object?>{
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
        'eventIds': <String, Object?>{
          'type': 'array',
          'maxItems': 50,
          'uniqueItems': true,
          'items': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
          },
        },
        'lastMessageBody': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 4096,
        },
        'lastMessageDirection': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'inbound',
            'outbound',
          ],
        },
        'lastMessageAtMillis': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
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
      },
    },
  },
};
