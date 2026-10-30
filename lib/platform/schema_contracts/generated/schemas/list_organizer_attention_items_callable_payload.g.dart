// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/list_organizer_attention_items_payload.schema.json.

const schemaListOrganizerAttentionItemsCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/list_organizer_attention_items_payload.schema.json',
  'title': 'ListOrganizerAttentionItemsCallablePayload',
  'description': 'Requests a complete, read-through-reconciled Host Today attention projection for one managed organizer.',
  'type': 'object',
  'additionalProperties': false,
  'x-owner': 'Host Today',
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
