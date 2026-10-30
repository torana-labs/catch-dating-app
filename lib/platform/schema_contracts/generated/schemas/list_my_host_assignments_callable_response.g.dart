// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/list_my_host_assignments_response.schema.json.

const schemaListMyHostAssignmentsCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/list_my_host_assignments_response.schema.json',
  'title': 'ListMyHostAssignmentsCallableResponse',
  'description': 'The caller\'s host work assignments with server-resolved shell destinations. Assignments sort by scope kind (event before program) then scope id.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'assignments',
    'shellEntry',
  ],
  'properties': <String, Object?>{
    'assignments': <String, Object?>{
      'type': 'array',
      'maxItems': 128,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'kind',
          'scopeId',
          'organizerId',
          'title',
          'subtitle',
          'organizerName',
          'duties',
          'destinations',
          'overflowDestinations',
          'shellMode',
          'grantExpiresAtMillis',
        ],
        'properties': <String, Object?>{
          'kind': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'event',
              'program',
            ],
          },
          'scopeId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
            'description': 'The eventId or programId this assignment scopes to.',
          },
          'organizerId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
          },
          'title': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 140,
          },
          'subtitle': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
            'maxLength': 140,
          },
          'organizerName': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 140,
          },
          'duties': <String, Object?>{
            'type': 'array',
            'items': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'duty',
              ],
              'properties': <String, Object?>{
                'duty': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'programAdmin',
                    'programCoordinator',
                    'guestRelations',
                    'communications',
                    'functionCheckIn',
                    'functionLead',
                    'airportGreeter',
                    'transportDispatcher',
                    'hotelDesk',
                    'reconciliationViewer',
                    'stakeholderViewer',
                    'eventLead',
                  ],
                  'description': 'Canonical duty across event and program scopes. checkInOperator event grants map to functionCheckIn; eventOperator grants map to eventLead.',
                },
                'pickupPointIds': <String, Object?>{
                  'type': 'array',
                  'maxItems': 32,
                  'items': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                    'maxLength': 180,
                  },
                  'description': 'Station scope for airportGreeter/transportDispatcher duties.',
                },
                'hotelIds': <String, Object?>{
                  'type': 'array',
                  'maxItems': 64,
                  'items': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                    'maxLength': 180,
                  },
                  'description': 'Hotel scope for hotelDesk duties.',
                },
                'functionIds': <String, Object?>{
                  'type': 'array',
                  'maxItems': 64,
                  'items': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                    'maxLength': 180,
                  },
                  'description': 'Function scope for functionCheckIn/functionLead duties.',
                },
              },
            },
          },
          'destinations': <String, Object?>{
            'type': 'array',
            'items': <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'arrivals',
                'dispatch',
                'inbound',
                'rooms',
                'nowNext',
                'door',
                'walkIns',
                'attention',
                'guests',
                'rsvpInbox',
                'imports',
                'inbox',
                'moments',
                'trips',
                'exceptions',
                'export',
                'overview',
                'team',
              ],
              'description': 'A restricted work-shell destination in canonical bottom-bar order. The server resolves the set from granted duties.',
            },
            'description': 'Resolved destinations in canonical order; the shell renders the first three plus an overflow entry.',
          },
          'overflowDestinations': <String, Object?>{
            'type': 'array',
            'items': <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'arrivals',
                'dispatch',
                'inbound',
                'rooms',
                'nowNext',
                'door',
                'walkIns',
                'attention',
                'guests',
                'rsvpInbox',
                'imports',
                'inbox',
                'moments',
                'trips',
                'exceptions',
                'export',
                'overview',
                'team',
              ],
              'description': 'A restricted work-shell destination in canonical bottom-bar order. The server resolves the set from granted duties.',
            },
            'description': 'Destinations beyond the first three, for the overflow menu.',
          },
          'shellMode': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'task',
              'tabs',
              'programWorkspace',
              'none',
            ],
            'description': 'task = single destination, no bar; tabs = two or three destinations in the bar; programWorkspace = program-locked coordinator workspace; none = no reachable destination.',
          },
          'grantExpiresAtMillis': <String, Object?>{
            'type': <Object?>[
              'integer',
              'null',
            ],
            'minimum': 0,
          },
        },
        'description': 'One staff assignment resolved server-side: the grant\'s canonical duties plus the derived shell destination set. Only live, unexpired grants are returned.',
      },
    },
    'shellEntry': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'managerShell',
        'workShell',
        'none',
      ],
      'description': 'The app shell the caller should land in: managers always get managerShell even when they also hold staff assignments; staff get workShell only while at least one assignment is live.',
    },
  },
};
