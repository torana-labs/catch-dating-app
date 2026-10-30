// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/admin_grant_organizer_entitlement_payload.schema.json.

const schemaAdminGrantOrganizerEntitlementCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/admin_grant_organizer_entitlement_payload.schema.json',
  'title': 'AdminGrantOrganizerEntitlementCallablePayload',
  'description': 'Admin-authorized grant of one entitlement SKU to an organizer. operationId makes the mutation idempotent across retries; server stamps grantedAt and grantedBy.',
  'type': 'object',
  'additionalProperties': false,
  'x-owner': 'Admin console finance ops',
  'required': <Object?>[
    'organizerId',
    'operationId',
    'sku',
    'unit',
    'quantityTotal',
    'source',
  ],
  'properties': <String, Object?>{
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'operationId': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9_-]{16,120}\$',
    },
    'sku': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'wedding_essentials',
        'wedding_pro',
        'wedding_signature',
        'wedding_transport_addon',
        'planner_annual',
      ],
    },
    'unit': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'program',
        'organizerYear',
      ],
    },
    'quantityTotal': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 1000000,
    },
    'validFromMillis': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
    },
    'validUntilMillis': <String, Object?>{
      'type': <Object?>[
        'integer',
        'null',
      ],
      'minimum': 0,
      'maximum': 9007199254740991,
    },
    'source': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'manualInvoice',
        'checkout',
        'promo',
      ],
    },
    'receiptRef': <String, Object?>{
      'type': 'string',
      'maxLength': 180,
    },
    'note': <String, Object?>{
      'type': 'string',
      'maxLength': 500,
    },
  },
};
