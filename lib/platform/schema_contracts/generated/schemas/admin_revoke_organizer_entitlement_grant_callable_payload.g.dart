// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/admin_revoke_organizer_entitlement_grant_payload.schema.json.

const schemaAdminRevokeOrganizerEntitlementGrantCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/admin_revoke_organizer_entitlement_grant_payload.schema.json',
  'title': 'AdminRevokeOrganizerEntitlementGrantCallablePayload',
  'description': 'Admin-authorized revocation of one existing entitlement grant. operationId makes the mutation idempotent across retries; revoke of an unknown or already-revoked grant fails closed.',
  'type': 'object',
  'additionalProperties': false,
  'x-owner': 'Admin console finance ops',
  'required': <Object?>[
    'organizerId',
    'operationId',
    'grantId',
    'reason',
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
    'grantId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'reason': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 500,
    },
  },
};
