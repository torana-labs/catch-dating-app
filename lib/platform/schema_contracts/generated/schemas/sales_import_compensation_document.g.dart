// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/sales_import_compensations.schema.json.

const schemaSalesImportCompensationDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/sales_import_compensations.schema.json',
  'title': 'SalesImportCompensationDocument',
  'description': 'Immutable private per-import per-organizer compensating effect; original job and lineage remain intact.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'salesImportCompensations',
  'x-firestore-path': 'salesImportCompensations/{effectId}',
  'x-owner': 'private Sales import compensation service',
  'required': <Object?>[
    'schemaVersion',
    'classification',
    'effectId',
    'importId',
    'organizerId',
    'mode',
    'sourceRowIds',
    'cohortIdsRemoved',
    'beforeRevision',
    'afterRevision',
    'beforeCohortMutationId',
    'afterCohortMutationId',
    'reason',
    'createdAt',
    'createdBy',
    'requestId',
  ],
  'properties': <String, Object?>{
    'schemaVersion': <String, Object?>{
      'const': 1,
    },
    'classification': <String, Object?>{
      'const': 'sales_private',
    },
    'effectId': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
    'importId': <String, Object?>{
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
    'mode': <String, Object?>{
      'enum': <Object?>[
        'archive_companion',
        'remove_cohorts',
      ],
    },
    'sourceRowIds': <String, Object?>{
      'type': 'array',
      'minItems': 1,
      'maxItems': 25,
      'items': <String, Object?>{
        'type': 'string',
        'minLength': 1,
        'maxLength': 180,
        'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
      },
    },
    'cohortIdsRemoved': <String, Object?>{
      'type': 'array',
      'maxItems': 30,
      'uniqueItems': true,
      'items': <String, Object?>{
        'type': 'string',
        'minLength': 1,
        'maxLength': 180,
        'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
      },
    },
    'beforeRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
    },
    'afterRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 2,
    },
    'beforeCohortMutationId': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'pattern': '^[a-f0-9]{64}\$',
        },
        <String, Object?>{
          'const': 'initial',
        },
      ],
    },
    'afterCohortMutationId': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
    'reason': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 2000,
    },
    'createdAt': <String, Object?>{
      'type': 'string',
      'format': 'date-time',
    },
    'createdBy': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'requestId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
  },
  'x-document-id-field': 'effectId',
};
