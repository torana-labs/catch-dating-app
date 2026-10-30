// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/organizer_intake_field_corrections.schema.json.

const schemaOrganizerIntakeFieldCorrectionDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/organizer_intake_field_corrections.schema.json',
  'title': 'OrganizerIntakeFieldCorrectionDocument',
  'description': 'Immutable, server-owned field correction captured when an admin first changes a source-seeded organizer value. Each correction owns a deterministic replay fixture id.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'organizerIntakeFieldCorrections',
  'x-firestore-path': 'organizerIntakeFieldCorrections/{correctionId}',
  'x-document-id-field': 'correctionId',
  'x-owner': 'adminUpdateOrganizerDetails callable',
  'required': <Object?>[
    'schemaVersion',
    'correctionId',
    'fixtureId',
    'organizerId',
    'sourceProfileId',
    'sourceWorkItemId',
    'sourceCandidateId',
    'field',
    'extractedValue',
    'correctedValue',
    'artifactId',
    'contentHash',
    'locator',
    'extractedBy',
    'extractorVersion',
    'confidence',
    'reviewNote',
    'correctedByUid',
    'correctedAt',
  ],
  'properties': <String, Object?>{
    'schemaVersion': <String, Object?>{
      'type': 'integer',
      'const': 1,
    },
    'correctionId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'fixtureId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'sourceProfileId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 160,
    },
    'sourceWorkItemId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'sourceCandidateId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 240,
    },
    'field': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'name',
        'location',
        'tags',
        'publicProfile.sourceSummary',
        'publicProfile.formats',
      ],
    },
    'extractedValue': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'maxLength': 2000,
        },
        <String, Object?>{
          'type': 'null',
        },
        <String, Object?>{
          'type': 'array',
          'maxItems': 40,
          'items': <String, Object?>{
            'type': 'string',
            'maxLength': 500,
          },
        },
      ],
    },
    'correctedValue': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'maxLength': 2000,
        },
        <String, Object?>{
          'type': 'null',
        },
        <String, Object?>{
          'type': 'array',
          'maxItems': 40,
          'items': <String, Object?>{
            'type': 'string',
            'maxLength': 500,
          },
        },
      ],
    },
    'artifactId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'contentHash': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
    'locator': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 1000,
    },
    'extractedBy': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'deterministic',
        'model',
        'human',
      ],
    },
    'extractorVersion': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 160,
    },
    'confidence': <String, Object?>{
      'type': <Object?>[
        'number',
        'null',
      ],
      'minimum': 0,
      'maximum': 1,
    },
    'reviewNote': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 1000,
    },
    'correctedByUid': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'correctedAt': <String, Object?>{
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
  'definitions': <String, Object?>{
    'correctionValue': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'maxLength': 2000,
        },
        <String, Object?>{
          'type': 'null',
        },
        <String, Object?>{
          'type': 'array',
          'maxItems': 40,
          'items': <String, Object?>{
            'type': 'string',
            'maxLength': 500,
          },
        },
      ],
    },
  },
};
