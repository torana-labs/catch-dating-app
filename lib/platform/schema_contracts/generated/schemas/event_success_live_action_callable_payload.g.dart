// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/event_success_live_action_payload.schema.json.

const schemaEventSuccessLiveActionCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/event_success_live_action_payload.schema.json',
  'title': 'EventSuccessLiveActionCallablePayload',
  'description': 'Revision-fenced live control action accepted by controlEventSuccessLive.',
  'x-callable-aliases': <Object?>[
    'controlEventSuccessLive',
  ],
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'eventId',
    'expectedRevision',
    'action',
  ],
  'properties': <String, Object?>{
    'eventId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'expectedRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 2147483647,
    },
    'action': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'setActiveStep',
        'startRevealCountdown',
        'cancelRevealCountdown',
        'publishReveal',
        'complete',
      ],
    },
    'activeStepIndex': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 100,
    },
    'roundIndex': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 100,
    },
    'confirmed': <String, Object?>{
      'type': 'boolean',
    },
    'accountabilityAcknowledged': <String, Object?>{
      'type': 'boolean',
      'description': 'Explicit Host acknowledgement that a sweep still has unresolved checked-in attendees.',
    },
  },
};
