// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/organizer_contact_tag_vocabularies.schema.json.

const schemaOrganizerContactTagVocabularyDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/organizer_contact_tag_vocabularies.schema.json',
  'title': 'OrganizerContactTagVocabularyDocument',
  'description': 'Organizer-authored manual CRM tag vocabulary. Tag ids are structurally distinct from computed audience segment ids.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'organizerContactTagVocabularies',
  'x-firestore-path': 'organizerContactTagVocabularies/{organizerId}',
  'x-document-id-field': 'organizerId',
  'x-owner': 'manager-only organizer contact mutation callable',
  'required': <Object?>[
    'organizerId',
    'tags',
    'updatedAt',
  ],
  'properties': <String, Object?>{
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'x-catch-ownership': 'server-only',
    },
    'tags': <String, Object?>{
      'type': 'array',
      'maxItems': 20,
      'uniqueItems': true,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'tagId',
          'label',
          'normalizedLabel',
          'createdByUid',
          'createdAt',
        ],
        'properties': <String, Object?>{
          'tagId': <String, Object?>{
            'type': 'string',
            'pattern': '^[a-f0-9]{32}\$',
          },
          'label': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 40,
          },
          'normalizedLabel': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 40,
          },
          'createdByUid': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
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
        },
      },
      'x-catch-ownership': 'server-only',
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
      'x-catch-ownership': 'server-only',
    },
  },
  'definitions': <String, Object?>{
    'tag': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'tagId',
        'label',
        'normalizedLabel',
        'createdByUid',
        'createdAt',
      ],
      'properties': <String, Object?>{
        'tagId': <String, Object?>{
          'type': 'string',
          'pattern': '^[a-f0-9]{32}\$',
        },
        'label': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 40,
        },
        'normalizedLabel': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 40,
        },
        'createdByUid': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
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
      },
    },
  },
};
