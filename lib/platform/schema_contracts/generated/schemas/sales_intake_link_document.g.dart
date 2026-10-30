// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/sales_intake_links.schema.json.

const schemaSalesIntakeLinkDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/sales_intake_links.schema.json',
  'title': 'SalesIntakeLinkDocument',
  'description': 'Immutable private join from exact reviewed Supply Intake candidate and canonical identity decision to the Sales companion account.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'salesIntakeLinks',
  'x-firestore-path': 'salesIntakeLinks/{linkId}',
  'x-document-id-field': 'linkId',
  'x-owner': 'adminLinkOrganizerIntakeToSales',
  'required': <Object?>[
    'schemaVersion',
    'classification',
    'linkId',
    'workItemId',
    'candidateId',
    'sourceRunId',
    'sourceWorkItemRevision',
    'sourceCandidateHash',
    'organizerId',
    'curationPath',
    'curationOperationType',
    'curationReviewedByUid',
    'curationReviewedAt',
    'linkedByUid',
    'linkedAt',
  ],
  'properties': <String, Object?>{
    'schemaVersion': <String, Object?>{
      'const': 1,
    },
    'classification': <String, Object?>{
      'const': 'sales_private',
    },
    'linkId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 96,
    },
    'workItemId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'candidateId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 240,
    },
    'sourceRunId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'sourceWorkItemRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
    },
    'sourceCandidateHash': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 96,
    },
    'curationPath': <String, Object?>{
      'type': 'string',
      'minLength': 34,
      'maxLength': 270,
    },
    'curationOperationType': <String, Object?>{
      'enum': <Object?>[
        'create_entity_draft',
        'attach_surface',
      ],
    },
    'curationReviewedByUid': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'curationReviewedAt': <String, Object?>{
      'type': 'string',
      'format': 'date-time',
      'maxLength': 48,
    },
    'linkedByUid': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'linkedAt': <String, Object?>{
      'type': 'string',
      'format': 'date-time',
      'maxLength': 48,
    },
  },
};
