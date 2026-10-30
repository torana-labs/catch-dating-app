// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/event_assistance_rcs_subscriptions.schema.json.

const schemaEventRcsSubscriptionDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/event_assistance_rcs_subscriptions.schema.json',
  'title': 'EventRcsSubscriptionDocument',
  'description': 'Authenticated RCS subscription observations scoped to a provider agent and recipient endpoint, across events. Stop observations restrict event-service messages; subscribe requests never grant event consent. No automatic retention deletion.',
  'x-firestore-collection': 'eventAssistanceRcsSubscriptions',
  'x-firestore-path': 'eventAssistanceRcsSubscriptions/{subscriptionId}',
  'x-document-id-field': 'subscriptionId',
  'x-owner': 'event-assistance authenticated RCS ingress',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'schemaVersion',
    'subscriptionId',
    'routeId',
    'agentId',
    'endpointHash',
    'revision',
    'lastStop',
    'lastSubscribeRequest',
    'updatedAt',
  ],
  'properties': <String, Object?>{
    'schemaVersion': <String, Object?>{
      'type': 'integer',
      'const': 1,
    },
    'subscriptionId': <String, Object?>{
      'type': 'string',
      'pattern': '^rcs-subscription:[a-f0-9]{64}\$',
    },
    'routeId': <String, Object?>{
      'type': 'string',
      'const': 'catchEventRcs',
    },
    'agentId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 512,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._@-]*\$',
    },
    'endpointHash': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
    'revision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
    },
    'lastStop': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'null',
        },
        <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'callbackId',
            'observedAt',
          ],
          'properties': <String, Object?>{
            'callbackId': <String, Object?>{
              'type': 'string',
              'pattern': '^rcs-event:[a-f0-9]{64}\$',
            },
            'observedAt': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 9007199254740991,
            },
          },
        },
      ],
    },
    'lastSubscribeRequest': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'null',
        },
        <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'callbackId',
            'observedAt',
          ],
          'properties': <String, Object?>{
            'callbackId': <String, Object?>{
              'type': 'string',
              'pattern': '^rcs-event:[a-f0-9]{64}\$',
            },
            'observedAt': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 9007199254740991,
            },
          },
        },
      ],
    },
    'updatedAt': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
    },
  },
  'anyOf': <Object?>[
    <String, Object?>{
      'properties': <String, Object?>{
        'lastStop': <String, Object?>{
          'type': 'object',
        },
      },
    },
    <String, Object?>{
      'properties': <String, Object?>{
        'lastSubscribeRequest': <String, Object?>{
          'type': 'object',
        },
      },
    },
  ],
  'definitions': <String, Object?>{
    'Observation': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'callbackId',
        'observedAt',
      ],
      'properties': <String, Object?>{
        'callbackId': <String, Object?>{
          'type': 'string',
          'pattern': '^rcs-event:[a-f0-9]{64}\$',
        },
        'observedAt': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 9007199254740991,
        },
      },
    },
  },
};
