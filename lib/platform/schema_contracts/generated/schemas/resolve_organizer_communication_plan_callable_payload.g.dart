// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/resolve_organizer_communication_plan_payload.schema.json.

const schemaResolveOrganizerCommunicationPlanCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/resolve_organizer_communication_plan_payload.schema.json',
  'title': 'ResolveOrganizerCommunicationPlanCallablePayload',
  'description': 'Manager-authorized request for one intent-aware organizer communication plan.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'organizerId',
    'intent',
    'target',
  ],
  'properties': <String, Object?>{
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'intent': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'individualConversation',
      ],
    },
    'target': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'kind',
        'contactId',
      ],
      'properties': <String, Object?>{
        'kind': <String, Object?>{
          'const': 'contact',
        },
        'contactId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
      },
    },
  },
};
