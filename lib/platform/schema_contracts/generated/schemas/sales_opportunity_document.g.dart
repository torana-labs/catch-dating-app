// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/sales_opportunities.schema.json.

const schemaSalesOpportunityDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/sales_opportunities.schema.json',
  'title': 'SalesOpportunityDocument',
  'description': 'Private sales pipeline stage, independent of public organizer status.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'salesOpportunities',
  'x-firestore-path': 'salesOpportunities/{opportunityId}',
  'x-owner': 'private Sales opportunity service',
  'required': <Object?>[
    'schemaVersion',
    'classification',
    'opportunityId',
    'organizerId',
    'revision',
    'motion',
    'stage',
    'ownerUid',
    'nextStep',
    'nextStepAt',
    'stageEnteredAt',
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
    'opportunityId': <String, Object?>{
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
    'motion': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 160,
    },
    'stage': <String, Object?>{
      'enum': <Object?>[
        'new_enquiry',
        'ready_to_contact',
        'contacted',
        'in_conversation',
        'demo_arranged',
        'demo_completed',
        'pilot_agreed',
        'pilot_running',
        'commercial_discussion',
        'closed_won',
        'closed_lost',
      ],
    },
    'ownerUid': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'nextStep': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'minLength': 0,
          'maxLength': 320,
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'nextStepAt': <String, Object?>{
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
    'stageEnteredAt': <String, Object?>{
      'type': 'string',
      'format': 'date-time',
      'maxLength': 48,
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
  'x-document-id-field': 'opportunityId',
};
