// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/get_event_rehearsal_guest_bootstrap_payload.schema.json.

const schemaGetEventRehearsalGuestBootstrapCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/get_event_rehearsal_guest_bootstrap_payload.schema.json',
  'title': 'GetEventRehearsalGuestBootstrapCallablePayload',
  'description': 'Redeems or refreshes an anonymous rehearsal guest view.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'publicRehearsalId',
    'clientInstanceId',
    'viewerToken',
    'slotToken',
  ],
  'properties': <String, Object?>{
    'publicRehearsalId': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9_-]{20,80}\$',
    },
    'clientInstanceId': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9_-]{16,80}\$',
    },
    'viewerToken': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 120,
    },
    'slotToken': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 180,
    },
  },
};
