// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/list_event_chat_messages_response.schema.json.

const schemaListEventChatMessagesCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/list_event_chat_messages_response.schema.json',
  'title': 'ListEventChatMessagesCallableResponse',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'messages',
    'nextBeforeSequence',
    'typing',
    'typingHasMore',
    'ownTypingRevision',
    'serverTimeMillis',
  ],
  'properties': <String, Object?>{
    'messages': <String, Object?>{
      'type': 'array',
      'maxItems': 30,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'messageId',
          'sequence',
          'sentAtMillis',
          'senderUid',
          'senderName',
          'available',
          'kind',
          'text',
          'reply',
          'reactionCounts',
          'myReaction',
          'myReactionRevision',
        ],
        'properties': <String, Object?>{
          'messageId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
          },
          'sequence': <String, Object?>{
            'type': 'integer',
            'minimum': 1,
            'maximum': 9007199254740991,
          },
          'sentAtMillis': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
            'maximum': 9007199254740991,
          },
          'senderUid': <String, Object?>{
            'anyOf': <Object?>[
              <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 180,
              },
              <String, Object?>{
                'type': 'null',
              },
            ],
          },
          'senderName': <String, Object?>{
            'anyOf': <Object?>[
              <String, Object?>{
                'type': 'string',
                'maxLength': 120,
              },
              <String, Object?>{
                'type': 'null',
              },
            ],
          },
          'available': <String, Object?>{
            'type': 'boolean',
          },
          'kind': <String, Object?>{
            'enum': <Object?>[
              'text',
              'announcement',
            ],
          },
          'text': <String, Object?>{
            'anyOf': <Object?>[
              <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 2000,
              },
              <String, Object?>{
                'type': 'null',
              },
            ],
          },
          'reply': <String, Object?>{
            'anyOf': <Object?>[
              <String, Object?>{
                'type': 'object',
                'additionalProperties': false,
                'required': <Object?>[
                  'messageId',
                  'senderUid',
                  'senderName',
                  'available',
                  'text',
                ],
                'properties': <String, Object?>{
                  'messageId': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                    'maxLength': 180,
                  },
                  'senderUid': <String, Object?>{
                    'anyOf': <Object?>[
                      <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 180,
                      },
                      <String, Object?>{
                        'type': 'null',
                      },
                    ],
                  },
                  'senderName': <String, Object?>{
                    'anyOf': <Object?>[
                      <String, Object?>{
                        'type': 'string',
                        'maxLength': 120,
                      },
                      <String, Object?>{
                        'type': 'null',
                      },
                    ],
                  },
                  'available': <String, Object?>{
                    'type': 'boolean',
                  },
                  'text': <String, Object?>{
                    'anyOf': <Object?>[
                      <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 2000,
                      },
                      <String, Object?>{
                        'type': 'null',
                      },
                    ],
                  },
                },
              },
              <String, Object?>{
                'type': 'null',
              },
            ],
          },
          'reactionCounts': <String, Object?>{
            'type': 'object',
            'additionalProperties': false,
            'required': <Object?>[
              'like',
              'love',
              'laugh',
              'wow',
              'sad',
              'thanks',
            ],
            'properties': <String, Object?>{
              'like': <String, Object?>{
                'type': 'integer',
                'minimum': 0,
                'maximum': 9007199254740991,
              },
              'love': <String, Object?>{
                'type': 'integer',
                'minimum': 0,
                'maximum': 9007199254740991,
              },
              'laugh': <String, Object?>{
                'type': 'integer',
                'minimum': 0,
                'maximum': 9007199254740991,
              },
              'wow': <String, Object?>{
                'type': 'integer',
                'minimum': 0,
                'maximum': 9007199254740991,
              },
              'sad': <String, Object?>{
                'type': 'integer',
                'minimum': 0,
                'maximum': 9007199254740991,
              },
              'thanks': <String, Object?>{
                'type': 'integer',
                'minimum': 0,
                'maximum': 9007199254740991,
              },
            },
          },
          'myReaction': <String, Object?>{
            'anyOf': <Object?>[
              <String, Object?>{
                'type': 'string',
                'enum': <Object?>[
                  'like',
                  'love',
                  'laugh',
                  'wow',
                  'sad',
                  'thanks',
                ],
              },
              <String, Object?>{
                'type': 'null',
              },
            ],
          },
          'myReactionRevision': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
            'maximum': 9007199254740991,
          },
        },
      },
    },
    'nextBeforeSequence': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'integer',
          'minimum': 1,
          'maximum': 9007199254740991,
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'typing': <String, Object?>{
      'type': 'array',
      'maxItems': 10,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'uid',
          'displayName',
          'expiresAtMillis',
        ],
        'properties': <String, Object?>{
          'uid': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
          },
          'displayName': <String, Object?>{
            'type': 'string',
            'maxLength': 120,
          },
          'expiresAtMillis': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
            'maximum': 9007199254740991,
          },
        },
      },
    },
    'typingHasMore': <String, Object?>{
      'type': 'boolean',
    },
    'ownTypingRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
    },
    'serverTimeMillis': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
    },
  },
};
