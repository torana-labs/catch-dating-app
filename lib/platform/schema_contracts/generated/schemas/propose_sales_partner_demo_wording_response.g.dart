// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/propose_sales_partner_demo_wording_response.schema.json.

const schemaProposeSalesPartnerDemoWordingResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/propose_sales_partner_demo_wording_response.schema.json',
  'title': 'ProposeSalesPartnerDemoWordingResponse',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'organizerId',
    'blueprintId',
    'proposalRevision',
    'sourcePreviewHash',
    'state',
    'sendAuthority',
    'capabilityApprovalAuthority',
    'organizerControlAuthority',
  ],
  'properties': <String, Object?>{
    'organizerId': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9_-]{3,128}\$',
    },
    'blueprintId': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9_-]{3,128}\$',
    },
    'proposalRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
    },
    'sourcePreviewHash': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
    'state': <String, Object?>{
      'const': 'pending_owner_review',
    },
    'sendAuthority': <String, Object?>{
      'const': false,
    },
    'capabilityApprovalAuthority': <String, Object?>{
      'const': false,
    },
    'organizerControlAuthority': <String, Object?>{
      'const': false,
    },
  },
  'x-callable-aliases': <Object?>[
    'proposeSalesPartnerDemoWording',
  ],
};
