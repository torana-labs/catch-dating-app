// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/sales_contact_relationships.schema.json.

const schemaSalesContactRelationshipDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/sales_contact_relationships.schema.json',
  'title': 'SalesContactRelationshipDocument',
  'description': 'Organizer-scoped role, endpoints, and human draft review. Draft review never grants send authority.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'salesContactRelationships',
  'x-firestore-path': 'salesContactRelationships/{relationshipId}',
  'x-owner': 'private Sales contact service',
  'required': <Object?>[
    'schemaVersion',
    'classification',
    'relationshipId',
    'contactId',
    'organizerId',
    'revision',
    'role',
    'decisionInfluence',
    'primary',
    'contactabilityStatus',
    'contactabilityReason',
    'contactabilityAt',
    'contactabilityBy',
    'draftReviewEvidenceId',
    'sendAuthority',
    'endpoints',
    'createdAt',
    'updatedAt',
    'updatedBy',
  ],
  'properties': <String, Object?>{
    'schemaVersion': <String, Object?>{
      'const': 1,
    },
    'classification': <String, Object?>{
      'const': 'sales_private',
    },
    'relationshipId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'contactId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'revision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 1000000000,
    },
    'role': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 160,
    },
    'decisionInfluence': <String, Object?>{
      'enum': <Object?>[
        'unknown',
        'decision_maker',
        'influencer',
        'operator',
      ],
    },
    'primary': <String, Object?>{
      'type': 'boolean',
    },
    'contactabilityStatus': <String, Object?>{
      'enum': <Object?>[
        'unknown',
        'draft_reviewed',
        'held',
        'suppressed',
      ],
    },
    'contactabilityReason': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'minLength': 0,
          'maxLength': 2000,
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'contactabilityAt': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'format': 'date-time',
          'maxLength': 48,
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'contactabilityBy': <String, Object?>{
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
    'draftReviewEvidenceId': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'sendAuthority': <String, Object?>{
      'const': false,
    },
    'endpoints': <String, Object?>{
      'type': 'array',
      'minItems': 0,
      'maxItems': 3,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'kind',
          'value',
          'verificationStatus',
        ],
        'properties': <String, Object?>{
          'kind': <String, Object?>{
            'enum': <Object?>[
              'email',
              'phone',
            ],
          },
          'value': <String, Object?>{
            'type': 'string',
            'minLength': 3,
            'maxLength': 160,
          },
          'verificationStatus': <String, Object?>{
            'enum': <Object?>[
              'unverified',
              'verified',
            ],
          },
          'evidenceId': <String, Object?>{
            'anyOf': <Object?>[
              <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 180,
                'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
              },
              <String, Object?>{
                'type': 'null',
              },
            ],
          },
        },
      },
    },
    'createdAt': <String, Object?>{
      'type': 'string',
      'format': 'date-time',
      'maxLength': 48,
    },
    'updatedAt': <String, Object?>{
      'type': 'string',
      'format': 'date-time',
      'maxLength': 48,
    },
    'updatedBy': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
  },
  'x-document-id-field': 'relationshipId',
  'allOf': <Object?>[
    <String, Object?>{
      'if': <String, Object?>{
        'properties': <String, Object?>{
          'contactabilityStatus': <String, Object?>{
            'const': 'draft_reviewed',
          },
        },
      },
      'then': <String, Object?>{
        'properties': <String, Object?>{
          'draftReviewEvidenceId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
            'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
          },
        },
      },
    },
  ],
};
