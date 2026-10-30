// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/sales_custom_fields.schema.json.

const schemaSalesCustomFieldDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/sales_custom_fields.schema.json',
  'title': 'SalesCustomFieldDocument',
  'description': 'Typed, namespaced private account field definition; never extends public organizer records.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'salesCustomFields',
  'x-firestore-path': 'salesCustomFields/{fieldId}',
  'x-owner': 'private Sales custom-field service',
  'required': <Object?>[
    'schemaVersion',
    'classification',
    'fieldId',
    'label',
    'normalizedLabel',
    'type',
    'recordType',
    'helpText',
    'enumOptions',
    'revision',
    'createdAt',
    'createdBy',
  ],
  'properties': <String, Object?>{
    'schemaVersion': <String, Object?>{
      'const': 1,
    },
    'classification': <String, Object?>{
      'const': 'sales_private',
    },
    'fieldId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'label': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 160,
    },
    'normalizedLabel': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 160,
    },
    'type': <String, Object?>{
      'enum': <Object?>[
        'string',
        'number',
        'boolean',
        'date',
        'enum',
      ],
    },
    'recordType': <String, Object?>{
      'const': 'account',
    },
    'helpText': <String, Object?>{
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
    'enumOptions': <String, Object?>{
      'type': 'array',
      'minItems': 0,
      'maxItems': 20,
      'items': <String, Object?>{
        'type': 'string',
        'minLength': 1,
        'maxLength': 160,
      },
    },
    'revision': <String, Object?>{
      'const': 1,
    },
    'createdAt': <String, Object?>{
      'type': 'string',
      'format': 'date-time',
      'maxLength': 48,
    },
    'createdBy': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
  },
  'x-document-id-field': 'fieldId',
  'allOf': <Object?>[
    <String, Object?>{
      'if': <String, Object?>{
        'properties': <String, Object?>{
          'type': <String, Object?>{
            'const': 'enum',
          },
        },
      },
      'then': <String, Object?>{
        'properties': <String, Object?>{
          'enumOptions': <String, Object?>{
            'minItems': 1,
          },
        },
      },
      'else': <String, Object?>{
        'properties': <String, Object?>{
          'enumOptions': <String, Object?>{
            'maxItems': 0,
          },
        },
      },
    },
  ],
};
