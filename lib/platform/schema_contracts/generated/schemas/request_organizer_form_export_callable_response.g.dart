// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/request_organizer_form_export_response.schema.json.

const schemaRequestOrganizerFormExportCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/request_organizer_form_export_response.schema.json',
  'title': 'RequestOrganizerFormExportCallableResponse',
  'description': 'Asynchronous export status and expiring download when complete.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'exportId',
    'status',
    'format',
    'rowCount',
    'downloadUrl',
    'expiresAtMillis',
    'errorMessage',
  ],
  'properties': <String, Object?>{
    'exportId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'status': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'pending',
        'running',
        'completed',
        'failed',
        'expired',
      ],
    },
    'format': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'csv',
        'xlsx',
      ],
    },
    'rowCount': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 100000,
    },
    'downloadUrl': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'format': 'uri',
      'maxLength': 4000,
    },
    'expiresAtMillis': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
    },
    'errorMessage': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 500,
    },
    'errorCode': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 80,
      'description': 'Stable failure code; response-query-stale requires refreshing before a new export request.',
    },
  },
};
