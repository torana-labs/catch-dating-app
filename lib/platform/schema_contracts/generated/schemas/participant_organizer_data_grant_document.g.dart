// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/participant_organizer_data_grants.schema.json.

const schemaParticipantOrganizerDataGrantDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/participant_organizer_data_grants.schema.json',
  'title': 'ParticipantOrganizerDataGrantDocument',
  'description': 'Append-stable consent receipt granting one organizer access to exact submitted fields for one application. Only revokedAt may transition after creation.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'participantOrganizerDataGrants',
  'x-firestore-path': 'participantOrganizerDataGrants/{grantId}',
  'x-document-id-field': 'grantId',
  'x-owner': 'organizer application submission and grant revocation callables',
  'required': <Object?>[
    'participantUid',
    'organizerId',
    'applicationId',
    'responseId',
    'formVersionId',
    'purpose',
    'grantedQuestionIds',
    'grantedCanonicalFieldIds',
    'consentVersion',
    'consentCopyHash',
    'grantedAt',
    'revokedAt',
  ],
  'properties': <String, Object?>{
    'participantUid': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'applicationId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'responseId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'formVersionId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'purpose': <String, Object?>{
      'type': 'string',
      'const': 'organizerApplicationReview',
    },
    'grantedQuestionIds': <String, Object?>{
      'type': 'array',
      'minItems': 1,
      'maxItems': 100,
      'uniqueItems': true,
      'items': <String, Object?>{
        'type': 'string',
        'minLength': 1,
        'maxLength': 120,
      },
    },
    'grantedCanonicalFieldIds': <String, Object?>{
      'type': 'array',
      'maxItems': 40,
      'uniqueItems': true,
      'items': <String, Object?>{
        'type': 'string',
        'x-catch-catalog': '../catalogs/person_fields.json',
        'enum': <Object?>[
          'givenName',
          'familyName',
          'displayName',
          'dateOfBirth',
          'age',
          'gender',
          'phoneNumber',
          'email',
          'instagramHandle',
          'linkedinUrl',
          'profilePhoto',
          'city',
          'heightCm',
          'occupation',
          'company',
          'education',
          'languages',
          'relationshipGoal',
          'interestedInGenders',
          'drinking',
          'smoking',
          'religion',
          'workout',
          'diet',
          'children',
        ],
      },
    },
    'consentVersion': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 80,
    },
    'consentCopyHash': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
    'grantedAt': <String, Object?>{
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
    'revokedAt': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
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
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
  },
};
