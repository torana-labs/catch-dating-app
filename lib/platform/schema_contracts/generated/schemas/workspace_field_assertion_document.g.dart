// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/workspace_field_assertions.schema.json.

const schemaWorkspaceFieldAssertionDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/workspace_field_assertions.schema.json',
  'title': 'WorkspaceFieldAssertionDocument',
  'description': 'Immutable per-field acquisition evidence, explicitly scoped to an existing program or community relationship. A contact pointer or UID does not disclose fields or verify endpoint ownership.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'workspaceFieldAssertions',
  'x-firestore-path': 'workspaceFieldAssertions/{assertionId}',
  'x-document-id-field': 'assertionId',
  'x-owner': 'workspace-scoped contact writers and reviewed field selection',
  'required': <Object?>[
    'schemaVersion',
    'workspaceRef',
    'organizerId',
    'relationshipRef',
    'fieldKey',
    'value',
    'sourceKind',
    'sourceId',
    'sourceVersion',
    'actorUid',
    'observedAtMillis',
    'disclosureBasis',
    'identityEvidenceRef',
    'programId',
  ],
  'properties': <String, Object?>{
    'schemaVersion': <String, Object?>{
      'const': 1,
    },
    'workspaceRef': <String, Object?>{
      'oneOf': <Object?>[
        <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'kind',
            'id',
          ],
          'properties': <String, Object?>{
            'kind': <String, Object?>{
              'const': 'program',
            },
            'id': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 180,
            },
          },
        },
        <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'kind',
            'id',
          ],
          'properties': <String, Object?>{
            'kind': <String, Object?>{
              'const': 'community',
            },
            'id': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 180,
            },
          },
        },
      ],
    },
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'relationshipRef': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'kind',
        'id',
      ],
      'properties': <String, Object?>{
        'kind': <String, Object?>{
          'enum': <Object?>[
            'programGuest',
            'programHousehold',
            'communityContact',
          ],
        },
        'id': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
      },
    },
    'fieldKey': <String, Object?>{
      'enum': <Object?>[
        'displayName',
        'phoneE164',
        'email',
      ],
    },
    'value': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 320,
    },
    'sourceKind': <String, Object?>{
      'enum': <Object?>[
        'manualEntry',
        'manifestRow',
      ],
    },
    'sourceId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 240,
    },
    'sourceVersion': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
    },
    'actorUid': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'observedAtMillis': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
    },
    'disclosureBasis': <String, Object?>{
      'const': 'workspaceHostAcquisition',
    },
    'identityEvidenceRef': <String, Object?>{
      'type': 'null',
    },
    'programId': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 1,
      'maxLength': 180,
      'description': 'Exact program retention index; null for community assertions. Must agree with workspaceRef.id in the domain writer.',
    },
  },
  'allOf': <Object?>[
    <String, Object?>{
      'if': <String, Object?>{
        'properties': <String, Object?>{
          'fieldKey': <String, Object?>{
            'const': 'displayName',
          },
        },
      },
      'then': <String, Object?>{
        'properties': <String, Object?>{
          'value': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
            'minLength': 1,
            'maxLength': 140,
          },
        },
      },
    },
    <String, Object?>{
      'if': <String, Object?>{
        'properties': <String, Object?>{
          'fieldKey': <String, Object?>{
            'const': 'phoneE164',
          },
        },
      },
      'then': <String, Object?>{
        'properties': <String, Object?>{
          'value': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
            'maxLength': 20,
          },
        },
      },
    },
    <String, Object?>{
      'if': <String, Object?>{
        'properties': <String, Object?>{
          'workspaceRef': <String, Object?>{
            'properties': <String, Object?>{
              'kind': <String, Object?>{
                'const': 'program',
              },
            },
          },
        },
      },
      'then': <String, Object?>{
        'properties': <String, Object?>{
          'programId': <String, Object?>{
            'type': 'string',
          },
          'relationshipRef': <String, Object?>{
            'properties': <String, Object?>{
              'kind': <String, Object?>{
                'enum': <Object?>[
                  'programGuest',
                  'programHousehold',
                ],
              },
            },
          },
        },
      },
      'else': <String, Object?>{
        'properties': <String, Object?>{
          'programId': <String, Object?>{
            'type': 'null',
          },
          'relationshipRef': <String, Object?>{
            'properties': <String, Object?>{
              'kind': <String, Object?>{
                'const': 'communityContact',
              },
            },
          },
        },
      },
    },
  ],
};
