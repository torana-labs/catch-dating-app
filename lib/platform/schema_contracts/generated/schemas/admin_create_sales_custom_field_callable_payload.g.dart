// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/admin_sales_fields_create_payload.schema.json.

const schemaAdminCreateSalesCustomFieldCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/admin_sales_fields_create_payload.schema.json',
  'title': 'Sales fields.create callable payload',
  'description': 'Private bounded Sales callable request. Server authorization and transaction policy are enforced separately.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'requestId',
    'field',
  ],
  'properties': <String, Object?>{
    'requestId': <String, Object?>{
      'type': 'string',
      'minLength': 8,
      'maxLength': 96,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'field': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'fieldId',
        'label',
        'type',
        'recordType',
      ],
      'properties': <String, Object?>{
        'fieldId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 96,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'label': <String, Object?>{
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
          'type': <Object?>[
            'string',
            'null',
          ],
          'maxLength': 320,
        },
        'enumOptions': <String, Object?>{
          'type': 'array',
          'maxItems': 20,
          'uniqueItems': true,
          'items': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 160,
          },
        },
      },
    },
  },
};
