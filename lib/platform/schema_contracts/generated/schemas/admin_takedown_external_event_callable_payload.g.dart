// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/admin_takedown_external_event_payload.schema.json.

const schemaAdminTakedownExternalEventCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/admin_takedown_external_event_payload.schema.json',
  'title': 'AdminTakedownExternalEventCallablePayload',
  'description': 'Callable payload accepted by adminTakedownExternalEvent. Dry-run validates and receipts a reviewed takedown; apply removes the external event from discovery without deleting audit history.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'eventId',
    'executionMode',
    'idempotencyKey',
    'reviewNote',
    'checklist',
  ],
  'properties': <String, Object?>{
    'eventId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'pattern': '^[A-Za-z0-9_-]+\$',
    },
    'executionMode': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'dry_run',
        'apply',
      ],
    },
    'idempotencyKey': <String, Object?>{
      'type': 'string',
      'minLength': 8,
      'maxLength': 180,
      'pattern': '^[A-Za-z0-9:_-]+\$',
    },
    'reviewNote': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 1000,
    },
    'checklist': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'sourceStatusReviewed',
        'takedownAuthorityReviewed',
        'downstreamVisibilityReviewed',
      ],
      'properties': <String, Object?>{
        'sourceStatusReviewed': <String, Object?>{
          'type': 'boolean',
        },
        'takedownAuthorityReviewed': <String, Object?>{
          'type': 'boolean',
        },
        'downstreamVisibilityReviewed': <String, Object?>{
          'type': 'boolean',
        },
      },
    },
  },
};
