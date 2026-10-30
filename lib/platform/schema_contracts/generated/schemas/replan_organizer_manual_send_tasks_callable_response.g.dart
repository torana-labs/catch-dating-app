// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/replan_organizer_manual_send_tasks_response.schema.json.

const schemaReplanOrganizerManualSendTasksCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/replan_organizer_manual_send_tasks_response.schema.json',
  'title': 'ReplanOrganizerManualSendTasksCallableResponse',
  'description': 'Current route advice for manual tasks. Returning this response never mutates or completes a task.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'organizerId',
    'results',
    'resolvedAtMillis',
  ],
  'properties': <String, Object?>{
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'results': <String, Object?>{
      'type': 'array',
      'minItems': 1,
      'maxItems': 50,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'taskId',
          'contactId',
          'disposition',
          'recommendedRouteId',
          'blocker',
        ],
        'properties': <String, Object?>{
          'taskId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
          },
          'contactId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
          },
          'disposition': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'keepByHand',
              'managedRouteAvailable',
              'unavailable',
              'taskInactive',
            ],
          },
          'recommendedRouteId': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
            'enum': <Object?>[
              'catchChat',
              'personalWhatsappHandoff',
              null,
            ],
          },
          'blocker': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
            'enum': <Object?>[
              'catchAccountRequired',
              'identityAmbiguous',
              'missingPhone',
              'organizerSuppressed',
              'contactOptedOut',
              'contactUnavailable',
              'endpointChanged',
              null,
            ],
          },
        },
      },
    },
    'resolvedAtMillis': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
    },
  },
};
