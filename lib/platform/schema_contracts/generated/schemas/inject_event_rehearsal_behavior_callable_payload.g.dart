// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/inject_event_rehearsal_behavior_payload.schema.json.

const schemaInjectEventRehearsalBehaviorCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/inject_event_rehearsal_behavior_payload.schema.json',
  'title': 'InjectEventRehearsalBehaviorCallablePayload',
  'description': 'Applies a deterministic synthetic-actor behavior or an internal-only fault.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'sessionId',
    'expectedRevision',
    'clientActionId',
    'actorId',
    'behavior',
    'faultId',
  ],
  'properties': <String, Object?>{
    'sessionId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'expectedRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 2147483647,
    },
    'clientActionId': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9_-]{8,120}\$',
    },
    'actorId': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'behavior': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'enum': <Object?>[
        'arrive',
        'arriveLate',
        'markNoShow',
        'leaveEarly',
        'return',
        'walkIn',
        'ambiguousClaim',
        'resolveClaim',
        'optOut',
        'optIn',
        'keepApart',
        'disconnect',
        'reconnect',
        null,
      ],
    },
    'faultId': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'none',
        'latency',
        'oneShotFailure',
        'listenerDisconnect',
        'staleRevision',
        'duplicateDelivery',
        'legacyFixture',
        'reducedMotion',
        'lowBandwidth',
      ],
    },
  },
};
