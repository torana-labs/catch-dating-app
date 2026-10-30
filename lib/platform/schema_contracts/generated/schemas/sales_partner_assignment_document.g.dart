// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/sales_partner_assignments.schema.json.

const schemaSalesPartnerAssignmentDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/sales_partner_assignments.schema.json',
  'title': 'SalesPartnerAssignmentDocument',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'salesPartnerAssignments',
  'x-firestore-path': 'salesPartnerAssignments/{id}',
  'x-document-id-field': 'organizerId',
  'x-owner': 'partner Sales scoped services',
  'required': <Object?>[
    'schemaVersion',
    'classification',
    'revision',
    'updatedAt',
    'organizerId',
    'partnerUid',
    'status',
    'originatorUid',
    'introducingSenderUid',
    'catchOwnerUid',
    'activationOwnerUid',
    'relationshipContext',
    'relationshipConfirmedAt',
    'channel',
    'nextAction',
    'reviewAt',
    'expiresAt',
    'assignedAt',
    'reason',
  ],
  'properties': <String, Object?>{
    'schemaVersion': <String, Object?>{
      'const': 1,
    },
    'classification': <String, Object?>{
      'const': 'sales_private',
    },
    'revision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
    },
    'updatedAt': <String, Object?>{
      'type': 'string',
      'format': 'date-time',
    },
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 128,
    },
    'partnerUid': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 128,
    },
    'status': <String, Object?>{
      'enum': <Object?>[
        'offered',
        'accepted',
        'declined',
        'revoked',
      ],
    },
    'originatorUid': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 128,
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'introducingSenderUid': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 128,
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'catchOwnerUid': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 128,
    },
    'activationOwnerUid': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 128,
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'relationshipContext': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 1000,
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'relationshipConfirmedAt': <String, Object?>{
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
    'channel': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'enum': <Object?>[
            'email',
            'whatsapp',
            'other',
          ],
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'nextAction': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 500,
    },
    'reviewAt': <String, Object?>{
      'type': 'string',
      'format': 'date-time',
    },
    'expiresAt': <String, Object?>{
      'type': 'string',
      'format': 'date-time',
    },
    'assignedAt': <String, Object?>{
      'type': 'string',
      'format': 'date-time',
    },
    'reason': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 1000,
    },
  },
};
