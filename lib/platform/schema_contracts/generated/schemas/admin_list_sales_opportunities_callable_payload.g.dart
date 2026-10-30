// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/admin_sales_opportunities_list_payload.schema.json.

const schemaAdminListSalesOpportunitiesCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/admin_sales_opportunities_list_payload.schema.json',
  'title': 'Sales opportunities.list callable payload',
  'description': 'Private bounded Sales callable request. Server authorization and transaction policy are enforced separately.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[],
  'properties': <String, Object?>{
    'limit': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 50,
    },
    'cursor': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 512,
    },
    'ownerUid': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 96,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'stage': <String, Object?>{
      'enum': <Object?>[
        'new_enquiry',
        'ready_to_contact',
        'contacted',
        'in_conversation',
        'demo_arranged',
        'demo_completed',
        'pilot_agreed',
        'pilot_running',
        'commercial_discussion',
        'closed_won',
        'closed_lost',
      ],
    },
  },
};
