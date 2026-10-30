// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/event_rehearsal_route_decisions.schema.json.

const schemaEventRehearsalRouteDecisionDocumentSchema = <String, Object?>{
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'sessionId',
    'clockId',
    'groupId',
    'progressRevision',
    'previousRevision',
    'departureRevision',
    'sourceHash',
    'alternativeId',
    'destination',
    'decisionId',
    'operationId',
    'decidedBy',
    'decidedAt',
  ],
  'properties': <String, Object?>{
    'sessionId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'clockId': <String, Object?>{
      'type': 'string',
      'pattern': '^clock:[a-f0-9]{64}\$',
    },
    'groupId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'progressRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 2,
      'maximum': 500,
    },
    'previousRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 499,
    },
    'departureRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 499,
    },
    'sourceHash': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
    'alternativeId': <String, Object?>{
      'type': 'string',
      'pattern': '^alternative:[a-f0-9]{64}\$',
    },
    'destination': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'kind',
            'placeId',
            'lateEntry',
          ],
          'properties': <String, Object?>{
            'kind': <String, Object?>{
              'type': 'string',
              'const': 'fixedPlace',
            },
            'placeId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 160,
              'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
            },
            'lateEntry': <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'allowed',
                'hostDecision',
                'closed',
              ],
            },
          },
        },
        <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'kind',
            'itineraryId',
            'stopId',
          ],
          'properties': <String, Object?>{
            'kind': <String, Object?>{
              'type': 'string',
              'const': 'itineraryStop',
            },
            'itineraryId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 2000,
            },
            'stopId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 2000,
            },
          },
        },
        <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'kind',
            'routeId',
            'groupId',
            'checkpointId',
          ],
          'properties': <String, Object?>{
            'kind': <String, Object?>{
              'type': 'string',
              'const': 'groupCheckpoint',
            },
            'routeId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 2000,
            },
            'groupId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 160,
              'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
            },
            'checkpointId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 2000,
            },
          },
        },
      ],
    },
    'decisionId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'operationId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'decidedBy': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'decidedAt': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
    },
  },
  'title': 'EventRehearsalRouteDecisionDocument',
  'description': 'An immutable synthetic route override layered on a recorded rehearsal departure.',
  'x-firestore-collection': 'eventRehearsalRouteDecisions',
  'x-firestore-path': 'eventRehearsalRouteDecisions/{decisionDocumentId}',
  'x-document-id-field': 'id',
  'x-owner': 'event rehearsal callables',
};
