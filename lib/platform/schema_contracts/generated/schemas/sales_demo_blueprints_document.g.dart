// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/sales_demo_blueprints.schema.json.

const schemaSalesDemoBlueprintsDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/sales_demo_blueprints.schema.json',
  'title': 'SalesDemoBlueprintDocument',
  'description': 'Private reviewed plan; only its preview object can reach an anonymous invitation view.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'schemaVersion',
    'classification',
    'blueprintId',
    'revision',
    'state',
    'organizerId',
    'candidateId',
    'opportunityId',
    'capability',
    'capabilityRevision',
    'evidenceRevision',
    'seedVersion',
    'formCapabilityReview',
    'fieldMappings',
    'preview',
    'reviewedByUid',
    'reviewedAt',
    'updatedAt',
    'updatedByUid',
  ],
  'properties': <String, Object?>{
    'schemaVersion': <String, Object?>{
      'const': 1,
    },
    'classification': <String, Object?>{
      'const': 'sales_private',
    },
    'blueprintId': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9_-]{3,128}\$',
    },
    'revision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
    },
    'state': <String, Object?>{
      'enum': <Object?>[
        'draft',
        'reviewed',
        'withdrawn',
      ],
    },
    'organizerId': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'pattern': '^[A-Za-z0-9_-]{3,128}\$',
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'candidateId': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'pattern': '^[A-Za-z0-9_-]{3,128}\$',
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'opportunityId': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'pattern': '^[A-Za-z0-9_-]{3,128}\$',
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'capability': <String, Object?>{
      'const': 'synthetic_forms_v1',
    },
    'capabilityRevision': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9_-]{3,128}\$',
    },
    'evidenceRevision': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9_-]{3,128}\$',
    },
    'seedVersion': <String, Object?>{
      'const': 1,
    },
    'formCapabilityReview': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'questionTypes',
        'branching',
        'requiredFields',
        'scoringApproval',
        'uploads',
      ],
      'properties': <String, Object?>{
        'questionTypes': <String, Object?>{
          'enum': <Object?>[
            'exact',
            'manual',
            'retained',
            'unsupported',
          ],
        },
        'branching': <String, Object?>{
          'enum': <Object?>[
            'exact',
            'manual',
            'retained',
            'unsupported',
          ],
        },
        'requiredFields': <String, Object?>{
          'enum': <Object?>[
            'exact',
            'manual',
            'retained',
            'unsupported',
          ],
        },
        'scoringApproval': <String, Object?>{
          'enum': <Object?>[
            'exact',
            'manual',
            'retained',
            'unsupported',
          ],
        },
        'uploads': <String, Object?>{
          'enum': <Object?>[
            'exact',
            'manual',
            'retained',
            'unsupported',
          ],
        },
      },
    },
    'fieldMappings': <String, Object?>{
      'type': 'array',
      'maxItems': 30,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'sourceField',
          'catchField',
          'disposition',
        ],
        'properties': <String, Object?>{
          'sourceField': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 160,
          },
          'catchField': <String, Object?>{
            'anyOf': <Object?>[
              <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 160,
              },
              <String, Object?>{
                'type': 'null',
              },
            ],
          },
          'disposition': <String, Object?>{
            'enum': <Object?>[
              'exact',
              'manual',
              'retained',
              'unsupported',
            ],
          },
        },
      },
    },
    'preview': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'brandName',
        'headline',
        'scenario',
        'steps',
        'retainedTools',
        'limitations',
        'cta',
      ],
      'properties': <String, Object?>{
        'brandName': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
        },
        'headline': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
        },
        'scenario': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
        },
        'steps': <String, Object?>{
          'type': 'array',
          'minItems': 3,
          'maxItems': 3,
          'items': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 160,
          },
        },
        'retainedTools': <String, Object?>{
          'type': 'array',
          'maxItems': 8,
          'items': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 160,
          },
        },
        'limitations': <String, Object?>{
          'type': 'array',
          'minItems': 1,
          'maxItems': 8,
          'items': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 160,
          },
        },
        'cta': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
        },
      },
    },
    'reviewedByUid': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'pattern': '^[A-Za-z0-9_-]{3,128}\$',
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'reviewedAt': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'format': 'date-time',
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'updatedAt': <String, Object?>{
      'type': 'string',
      'format': 'date-time',
    },
    'updatedByUid': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9_-]{3,128}\$',
    },
    'setupPlan': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'mode',
            'requirements',
          ],
          'properties': <String, Object?>{
            'mode': <String, Object?>{
              'const': 'manual',
            },
            'requirements': <String, Object?>{
              'type': 'array',
              'maxItems': 12,
              'items': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 160,
              },
              'minItems': 1,
            },
          },
        },
        <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'mode',
            'requirements',
            'templateId',
            'title',
            'templateVersion',
            'templateHash',
            'materializerVersion',
          ],
          'properties': <String, Object?>{
            'mode': <String, Object?>{
              'const': 'template',
            },
            'requirements': <String, Object?>{
              'type': 'array',
              'maxItems': 12,
              'items': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 160,
              },
            },
            'templateId': <String, Object?>{
              'type': 'string',
              'pattern': '^[A-Za-z0-9_-]{3,128}\$',
            },
            'title': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 160,
            },
            'templateVersion': <String, Object?>{
              'type': 'integer',
              'minimum': 1,
            },
            'templateHash': <String, Object?>{
              'type': 'string',
              'pattern': '^[a-f0-9]{64}\$',
            },
            'materializerVersion': <String, Object?>{
              'const': 1,
            },
          },
        },
      ],
    },
    'partnerReviewGrant': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'revision',
        'state',
        'partnerUid',
        'assignmentRevision',
        'blueprintRevision',
        'previewHash',
        'expiresAt',
        'ownerReviewedByUid',
        'ownerReviewedAt',
      ],
      'properties': <String, Object?>{
        'revision': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
        },
        'state': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'active',
            'withdrawn',
          ],
        },
        'partnerUid': <String, Object?>{
          'type': 'string',
          'pattern': '^[A-Za-z0-9_-]{3,128}\$',
        },
        'assignmentRevision': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
        },
        'blueprintRevision': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
        },
        'previewHash': <String, Object?>{
          'type': 'string',
          'pattern': '^[a-f0-9]{64}\$',
        },
        'expiresAt': <String, Object?>{
          'type': 'string',
          'format': 'date-time',
        },
        'ownerReviewedByUid': <String, Object?>{
          'type': 'string',
          'pattern': '^[A-Za-z0-9_-]{3,128}\$',
        },
        'ownerReviewedAt': <String, Object?>{
          'type': 'string',
          'format': 'date-time',
        },
      },
    },
    'partnerPreviewProposal': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'revision',
        'state',
        'partnerUid',
        'assignmentRevision',
        'blueprintRevision',
        'sourcePreviewHash',
        'wording',
        'proposedAt',
      ],
      'properties': <String, Object?>{
        'revision': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
        },
        'state': <String, Object?>{
          'const': 'pending_owner_review',
        },
        'partnerUid': <String, Object?>{
          'type': 'string',
          'pattern': '^[A-Za-z0-9_-]{3,128}\$',
        },
        'assignmentRevision': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
        },
        'blueprintRevision': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
        },
        'sourcePreviewHash': <String, Object?>{
          'type': 'string',
          'pattern': '^[a-f0-9]{64}\$',
        },
        'wording': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'headline',
            'scenario',
            'cta',
          ],
          'properties': <String, Object?>{
            'headline': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 160,
              'pattern': '^[^<>\\u0000-\\u001f]+\$',
            },
            'scenario': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 160,
              'pattern': '^[^<>\\u0000-\\u001f]+\$',
            },
            'cta': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 160,
              'pattern': '^[^<>\\u0000-\\u001f]+\$',
            },
          },
        },
        'proposedAt': <String, Object?>{
          'type': 'string',
          'format': 'date-time',
        },
      },
    },
  },
  'definitions': <String, Object?>{
    'id': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9_-]{3,128}\$',
    },
    'text': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 160,
    },
    'disposition': <String, Object?>{
      'enum': <Object?>[
        'exact',
        'manual',
        'retained',
        'unsupported',
      ],
    },
  },
  'x-firestore-collection': 'salesDemoBlueprints',
  'x-firestore-path': 'salesDemoBlueprints/{blueprintId}',
  'x-document-id-field': 'blueprintId',
  'x-owner': 'sales demo admin callable',
};
