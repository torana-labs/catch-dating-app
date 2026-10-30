// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/get_organizer_entitlement_payload.schema.json.

const schemaGetOrganizerEntitlementCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/get_organizer_entitlement_payload.schema.json',
  'title': 'GetOrganizerEntitlementCallablePayload',
  'description': 'Requests the bounded entitlement projection (grants, meters, SKU catalog) for one managed organizer.',
  'type': 'object',
  'additionalProperties': false,
  'x-owner': 'Host organizer plan surface',
  'required': <Object?>[
    'organizerId',
  ],
  'properties': <String, Object?>{
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
  },
};
