// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/admin_sales_tasks_upsert_payload.schema.json.

const schemaAdminUpsertSalesTaskCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/admin_sales_tasks_upsert_payload.schema.json',
  'title': 'Sales tasks.upsert callable payload',
  'description': 'Private bounded Sales callable request. Server authorization and transaction policy are enforced separately.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'organizerId',
    'requestId',
    'expectedRevision',
    'task',
  ],
  'properties': <String, Object?>{
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 96,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'requestId': <String, Object?>{
      'type': 'string',
      'minLength': 8,
      'maxLength': 96,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'expectedRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 1000000000,
    },
    'taskId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 96,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'task': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'kind',
        'title',
        'dueAt',
        'ownerUid',
        'status',
      ],
      'properties': <String, Object?>{
        'kind': <String, Object?>{
          'enum': <Object?>[
            'research',
            'reply',
            'follow_up',
            'demo',
            'pilot',
            'duplicate_review',
            'opt_out',
            'service_commitment',
          ],
        },
        'title': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
        },
        'dueAt': <String, Object?>{
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
        'contactId': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 96,
              'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
            },
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
        'ownerUid': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 96,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'status': <String, Object?>{
          'enum': <Object?>[
            'open',
            'completed',
            'cancelled',
          ],
        },
      },
    },
  },
};
