// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/resolve_organizer_communication_plan_response.schema.json.

const schemaResolveOrganizerCommunicationPlanCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/resolve_organizer_communication_plan_response.schema.json',
  'title': 'ResolveOrganizerCommunicationPlanCallableResponse',
  'description': 'Server-derived communication routes and blockers for a named organizer intent at one capability snapshot.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'organizerId',
    'intent',
    'capabilityVersion',
    'resolvedAtMillis',
    'recipients',
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
    'capabilityVersion': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 1000000,
    },
    'resolvedAtMillis': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
    },
    'recipients': <String, Object?>{
      'type': 'array',
      'minItems': 1,
      'maxItems': 1,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'contactId',
          'displayName',
          'outcome',
          'recommendedRouteId',
          'routes',
        ],
        'properties': <String, Object?>{
          'contactId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
          },
          'displayName': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 120,
          },
          'outcome': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'inCatch',
              'automatic',
              'byHand',
              'unavailable',
            ],
          },
          'recommendedRouteId': <String, Object?>{
            'anyOf': <Object?>[
              <String, Object?>{
                'type': 'string',
                'enum': <Object?>[
                  'personalWhatsappHandoff',
                  'personalEmailHandoff',
                  'organizerWhatsappCampaign',
                  'catchWhatsapp',
                  'catchChat',
                  'catchEventAnnouncement',
                  'organizerFollowerUpdate',
                ],
              },
              <String, Object?>{
                'type': 'null',
              },
            ],
          },
          'routes': <String, Object?>{
            'type': 'array',
            'minItems': 3,
            'maxItems': 3,
            'items': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'routeId',
                'executionMode',
                'availability',
                'blocker',
              ],
              'properties': <String, Object?>{
                'routeId': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'personalWhatsappHandoff',
                    'personalEmailHandoff',
                    'organizerWhatsappCampaign',
                    'catchWhatsapp',
                    'catchChat',
                    'catchEventAnnouncement',
                    'organizerFollowerUpdate',
                  ],
                },
                'executionMode': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'managedDelivery',
                    'externalHandoff',
                  ],
                },
                'availability': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'available',
                    'unavailable',
                  ],
                },
                'blocker': <String, Object?>{
                  'anyOf': <Object?>[
                    <String, Object?>{
                      'type': 'string',
                      'enum': <Object?>[
                        'catchAccountRequired',
                        'identityAmbiguous',
                        'missingPhone',
                        'missingEmail',
                        'organizerSuppressed',
                        'contactOptedOut',
                        'permissionRequired',
                        'senderUnavailable',
                        'intentUnsupported',
                      ],
                    },
                    <String, Object?>{
                      'type': 'null',
                    },
                  ],
                },
              },
            },
          },
        },
      },
    },
  },
  'definitions': <String, Object?>{
    'routeId': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'personalWhatsappHandoff',
        'personalEmailHandoff',
        'organizerWhatsappCampaign',
        'catchWhatsapp',
        'catchChat',
        'catchEventAnnouncement',
        'organizerFollowerUpdate',
      ],
    },
    'routeBlocker': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'catchAccountRequired',
        'identityAmbiguous',
        'missingPhone',
        'missingEmail',
        'organizerSuppressed',
        'contactOptedOut',
        'permissionRequired',
        'senderUnavailable',
        'intentUnsupported',
      ],
    },
    'routeOption': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'routeId',
        'executionMode',
        'availability',
        'blocker',
      ],
      'properties': <String, Object?>{
        'routeId': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'personalWhatsappHandoff',
            'personalEmailHandoff',
            'organizerWhatsappCampaign',
            'catchWhatsapp',
            'catchChat',
            'catchEventAnnouncement',
            'organizerFollowerUpdate',
          ],
        },
        'executionMode': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'managedDelivery',
            'externalHandoff',
          ],
        },
        'availability': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'available',
            'unavailable',
          ],
        },
        'blocker': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'catchAccountRequired',
                'identityAmbiguous',
                'missingPhone',
                'missingEmail',
                'organizerSuppressed',
                'contactOptedOut',
                'permissionRequired',
                'senderUnavailable',
                'intentUnsupported',
              ],
            },
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
      },
    },
    'recipientPlan': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'contactId',
        'displayName',
        'outcome',
        'recommendedRouteId',
        'routes',
      ],
      'properties': <String, Object?>{
        'contactId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        'displayName': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 120,
        },
        'outcome': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'inCatch',
            'automatic',
            'byHand',
            'unavailable',
          ],
        },
        'recommendedRouteId': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'personalWhatsappHandoff',
                'personalEmailHandoff',
                'organizerWhatsappCampaign',
                'catchWhatsapp',
                'catchChat',
                'catchEventAnnouncement',
                'organizerFollowerUpdate',
              ],
            },
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
        'routes': <String, Object?>{
          'type': 'array',
          'minItems': 3,
          'maxItems': 3,
          'items': <String, Object?>{
            'type': 'object',
            'additionalProperties': false,
            'required': <Object?>[
              'routeId',
              'executionMode',
              'availability',
              'blocker',
            ],
            'properties': <String, Object?>{
              'routeId': <String, Object?>{
                'type': 'string',
                'enum': <Object?>[
                  'personalWhatsappHandoff',
                  'personalEmailHandoff',
                  'organizerWhatsappCampaign',
                  'catchWhatsapp',
                  'catchChat',
                  'catchEventAnnouncement',
                  'organizerFollowerUpdate',
                ],
              },
              'executionMode': <String, Object?>{
                'type': 'string',
                'enum': <Object?>[
                  'managedDelivery',
                  'externalHandoff',
                ],
              },
              'availability': <String, Object?>{
                'type': 'string',
                'enum': <Object?>[
                  'available',
                  'unavailable',
                ],
              },
              'blocker': <String, Object?>{
                'anyOf': <Object?>[
                  <String, Object?>{
                    'type': 'string',
                    'enum': <Object?>[
                      'catchAccountRequired',
                      'identityAmbiguous',
                      'missingPhone',
                      'missingEmail',
                      'organizerSuppressed',
                      'contactOptedOut',
                      'permissionRequired',
                      'senderUnavailable',
                      'intentUnsupported',
                    ],
                  },
                  <String, Object?>{
                    'type': 'null',
                  },
                ],
              },
            },
          },
        },
      },
    },
  },
};
