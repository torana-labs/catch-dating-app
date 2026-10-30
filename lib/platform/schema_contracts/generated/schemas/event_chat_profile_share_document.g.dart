// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/event_chat_profile_shares.schema.json.

const schemaEventChatProfileShareDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/event_chat_profile_shares.schema.json',
  'title': 'EventChatProfileShareDocument',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'eventId',
    'uid',
    'organizerId',
    'revision',
    'selection',
    'createdAt',
    'updatedAt',
  ],
  'properties': <String, Object?>{
    'eventId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'uid': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'organizerId': <String, Object?>{
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
    'revision': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
    },
    'selection': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'profileRevision',
            'membershipRevision',
            'coreFieldIds',
            'photoId',
            'card',
            'termsVersion',
          ],
          'properties': <String, Object?>{
            'profileRevision': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 9007199254740991,
            },
            'membershipRevision': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 9007199254740991,
            },
            'coreFieldIds': <String, Object?>{
              'type': 'array',
              'maxItems': 14,
              'uniqueItems': true,
              'items': <String, Object?>{
                'type': 'string',
                'enum': <Object?>[
                  'age',
                  'gender',
                  'city',
                  'heightCm',
                  'occupation',
                  'company',
                  'education',
                  'languages',
                  'relationshipGoal',
                  'drinking',
                  'smoking',
                  'workout',
                  'diet',
                  'children',
                ],
              },
            },
            'photoId': <String, Object?>{
              'anyOf': <Object?>[
                <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 80,
                  'pattern': '^[A-Za-z0-9_-]+\$',
                },
                <String, Object?>{
                  'type': 'null',
                },
              ],
            },
            'card': <String, Object?>{
              'anyOf': <Object?>[
                <String, Object?>{
                  'type': 'object',
                  'additionalProperties': false,
                  'required': <Object?>[
                    'responseId',
                    'revision',
                    'questionIds',
                  ],
                  'properties': <String, Object?>{
                    'responseId': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 180,
                    },
                    'revision': <String, Object?>{
                      'type': 'integer',
                      'minimum': 0,
                      'maximum': 9007199254740991,
                    },
                    'questionIds': <String, Object?>{
                      'type': 'array',
                      'uniqueItems': true,
                      'maxItems': 20,
                      'items': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 180,
                      },
                      'minItems': 1,
                    },
                  },
                },
                <String, Object?>{
                  'type': 'null',
                },
              ],
            },
            'firstName': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 80,
              'pattern': '^\\S(?:[\\s\\S]*\\S)?\$',
            },
            'introduction': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 500,
              'pattern': '^\\S(?:[\\s\\S]*\\S)?\$',
            },
            'termsVersion': <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'event-profile-sharing-v1',
                'event-profile-sharing-v2',
              ],
            },
          },
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'createdAt': <String, Object?>{
      'type': 'object',
      'description': 'Serialized Firestore Timestamp fixture shape.',
      'x-firestore-type': 'timestamp',
      'additionalProperties': false,
      'required': <Object?>[
        '_seconds',
        '_nanoseconds',
      ],
      'properties': <String, Object?>{
        '_seconds': <String, Object?>{
          'type': 'integer',
        },
        '_nanoseconds': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 999999999,
        },
      },
    },
    'updatedAt': <String, Object?>{
      'type': 'object',
      'description': 'Serialized Firestore Timestamp fixture shape.',
      'x-firestore-type': 'timestamp',
      'additionalProperties': false,
      'required': <Object?>[
        '_seconds',
        '_nanoseconds',
      ],
      'properties': <String, Object?>{
        '_seconds': <String, Object?>{
          'type': 'integer',
        },
        '_nanoseconds': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 999999999,
        },
      },
    },
  },
  'description': 'Explicit event-specific mini-profile selection. Pointers only; current membership, profile and card revisions must still match.',
  'x-firestore-collection': 'eventChatProfileShares',
  'x-firestore-path': 'eventChatProfileShares/{shareId}',
  'x-document-id-field': 'shareId',
  'x-owner': 'event profile sharing callables',
};
