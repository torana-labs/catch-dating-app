// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/workspace_field_decisions.schema.json.

const schemaWorkspaceFieldDecisionDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  'type': 'object',
  'additionalProperties': false,
  '\$id': 'https://catch.app/contracts/firestore/workspace_field_decisions.schema.json',
  'title': 'WorkspaceFieldDecisionDocument',
  'description': 'Immutable explicit field-selection decision. Records the authorized reviewer and exact before/after assertion pointers without copying field values or granting identity proof.',
  'x-firestore-collection': 'workspaceFieldDecisions',
  'x-firestore-path': 'workspaceFieldDecisions/{decisionId}',
  'x-document-id-field': 'decisionId',
  'x-owner': 'workspace scoped reviewed field selection',
  'required': <Object?>[
    'schemaVersion',
    'workspaceRef',
    'organizerId',
    'programId',
    'relationshipRef',
    'fieldKey',
    'actorUid',
    'observedAtMillis',
    'selectedAssertionId',
    'previousAssertionId',
    'relationshipRevision',
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
    'programId': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 1,
      'maxLength': 180,
      'description': 'Exact program retention index; null for community assertions. Must agree with workspaceRef.id in the domain writer.',
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
    'selectedAssertionId': <String, Object?>{
      'type': 'string',
      'pattern': '^wfa_[a-f0-9]{64}\$',
    },
    'previousAssertionId': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'pattern': '^wfa_[a-f0-9]{64}\$',
    },
    'relationshipRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
    },
  },
  'allOf': <Object?>[
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
