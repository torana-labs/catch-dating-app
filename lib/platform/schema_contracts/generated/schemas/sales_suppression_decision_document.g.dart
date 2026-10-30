// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/sales_suppression_decisions.schema.json.

const schemaSalesSuppressionDecisionDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/sales_suppression_decisions.schema.json',
  'title': 'SalesSuppressionDecisionDocument',
  'description': 'Append-only human decision. Contact draft review never means send permission.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'salesSuppressionDecisions',
  'x-firestore-path': 'salesSuppressionDecisions/{decisionId}',
  'x-owner': 'private Sales suppression and contactability service',
  'required': <Object?>[
    'schemaVersion',
    'classification',
    'decisionId',
    'targetType',
    'organizerId',
    'contactId',
    'previousStatus',
    'status',
    'reason',
    'actorUid',
    'recordedAt',
  ],
  'properties': <String, Object?>{
    'schemaVersion': <String, Object?>{
      'const': 1,
    },
    'classification': <String, Object?>{
      'const': 'sales_private',
    },
    'decisionId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'targetType': <String, Object?>{
      'enum': <Object?>[
        'account',
        'contact_relationship',
      ],
    },
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'contactId': <String, Object?>{
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
    'previousStatus': <String, Object?>{
      'enum': <Object?>[
        'clear',
        'unknown',
        'draft_reviewed',
        'held',
        'suppressed',
      ],
    },
    'status': <String, Object?>{
      'enum': <Object?>[
        'clear',
        'unknown',
        'draft_reviewed',
        'held',
        'suppressed',
      ],
    },
    'reason': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 2000,
    },
    'actorUid': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'recordedAt': <String, Object?>{
      'type': 'string',
      'format': 'date-time',
      'maxLength': 48,
    },
    'accountRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 1000000000,
    },
    'relationshipRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 1000000000,
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
    'sendAuthority': <String, Object?>{
      'const': false,
    },
  },
  'x-document-id-field': 'decisionId',
  'allOf': <Object?>[
    <String, Object?>{
      'if': <String, Object?>{
        'properties': <String, Object?>{
          'targetType': <String, Object?>{
            'const': 'account',
          },
        },
      },
      'then': <String, Object?>{
        'required': <Object?>[
          'accountRevision',
        ],
        'properties': <String, Object?>{
          'contactId': <String, Object?>{
            'type': 'null',
          },
        },
        'not': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'required': <Object?>[
                'relationshipRevision',
              ],
            },
            <String, Object?>{
              'required': <Object?>[
                'evidenceId',
              ],
            },
            <String, Object?>{
              'required': <Object?>[
                'sendAuthority',
              ],
            },
          ],
        },
      },
      'else': <String, Object?>{
        'required': <Object?>[
          'relationshipRevision',
          'evidenceId',
          'sendAuthority',
        ],
        'properties': <String, Object?>{
          'contactId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
            'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
          },
        },
        'not': <String, Object?>{
          'required': <Object?>[
            'accountRevision',
          ],
        },
      },
    },
  ],
};
