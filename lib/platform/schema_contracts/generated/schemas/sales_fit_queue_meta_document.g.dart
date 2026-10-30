// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/sales_fit_queue_meta.schema.json.

const schemaSalesFitQueueMetaDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/sales_fit_queue_meta.schema.json',
  'title': 'SalesFitQueueMetaDocument',
  'description': 'Private generation fence incremented atomically by every fit refresh and source invalidation.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'salesFitQueueMeta',
  'x-firestore-path': 'salesFitQueueMeta/{metaId}',
  'x-document-id-field': 'metaId',
  'x-owner': 'private Sales fit queue service and source mutation hooks',
  'required': <Object?>[
    'schemaVersion',
    'classification',
    'metaId',
    'generation',
    'updatedAt',
  ],
  'properties': <String, Object?>{
    'schemaVersion': <String, Object?>{
      'const': 1,
    },
    'classification': <String, Object?>{
      'const': 'sales_private',
    },
    'metaId': <String, Object?>{
      'const': 'current',
    },
    'generation': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
    },
    'updatedAt': <String, Object?>{
      'type': 'string',
      'format': 'date-time',
    },
  },
};
