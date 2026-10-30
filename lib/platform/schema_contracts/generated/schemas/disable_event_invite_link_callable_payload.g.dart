// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/disable_event_invite_link_payload.schema.json.

const schemaDisableEventInviteLinkCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/disable_event_invite_link_payload.schema.json',
  'title': 'DisableEventInviteLinkCallablePayload',
  'description': 'Callable payload accepted by disableEventInviteLink. Disabled links stop accepting new attribution but remain in host reporting.',
  'x-callable-aliases': <Object?>[
    'disableEventInviteLink',
  ],
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'eventId',
    'inviteLinkId',
  ],
  'properties': <String, Object?>{
    'eventId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'inviteLinkId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
  },
};
