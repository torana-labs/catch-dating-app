// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from operations/event_assistance_source_work.schema.json.

const schemaEventAssistanceSourceWorkSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/operations/event_assistance_source_work.schema.json',
  'title': 'EventAssistanceSourceWork',
  'description': 'Private bounded source-change fanout using Operations work items. Waking work grants no domain or provider authority.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'schemaVersion',
    'kind',
    'signalId',
    'source',
    'scope',
    'expiresAt',
    'checkpoint',
  ],
  'properties': <String, Object?>{
    'schemaVersion': <String, Object?>{
      'const': 1,
      'type': 'integer',
    },
    'kind': <String, Object?>{
      'const': 'liveSourceWake',
      'type': 'string',
    },
    'signalId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'source': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'eventId',
        'collection',
        'documentId',
        'occurredAt',
      ],
      'properties': <String, Object?>{
        'eventId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'collection': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'events',
            'eventAttendees',
            'eventSuccessPlans',
            'eventAssistanceGuests',
            'eventAssistanceSettings',
            'eventAssistanceGroupProgress',
            'eventAssistanceMemberships',
            'eventAssistanceMessages',
            'eventAssistanceRuntimeConfigs',
            'eventAssistanceSmsPermissions',
            'eventAssistanceWhatsappPermissions',
            'eventAssistanceSmsSenders',
            'eventAssistanceSmsBudgets',
            'organizerSenderConnections',
            'eventAssistanceWhatsappPolicies',
            'organizerMessageTemplates',
            'eventAssistanceWhatsappBudgets',
            'organizerWhatsappEndpointStops',
            'organizerContactChannelStates',
            'eventStaffGrants',
            'eventAssistanceRcsPermissions',
            'eventAssistanceRcsSenders',
            'eventAssistanceRcsBudgets',
            'eventAssistanceRcsSubscriptions',
          ],
        },
        'documentId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'occurredAt': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 9007199254740991,
        },
      },
    },
    'scope': <String, Object?>{
      'oneOf': <Object?>[
        <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'context',
            'attendeeId',
          ],
          'properties': <String, Object?>{
            'context': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'mode',
                'eventId',
                'organizerId',
              ],
              'properties': <String, Object?>{
                'mode': <String, Object?>{
                  'type': 'string',
                  'const': 'live',
                },
                'eventId': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 160,
                  'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                },
                'organizerId': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 2000,
                },
              },
            },
            'attendeeId': <String, Object?>{
              'anyOf': <Object?>[
                <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 180,
                  'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                },
                <String, Object?>{
                  'type': 'null',
                },
              ],
            },
          },
        },
        <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'description': 'Refresh only existing checkpoint requests whose immutable departure roster contains this attendee. Never enroll guests or dispatch messages.',
          'required': <Object?>[
            'kind',
            'context',
            'attendeeId',
          ],
          'properties': <String, Object?>{
            'kind': <String, Object?>{
              'type': 'string',
              'const': 'checkpointMember',
            },
            'context': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'mode',
                'eventId',
                'organizerId',
              ],
              'properties': <String, Object?>{
                'mode': <String, Object?>{
                  'type': 'string',
                  'const': 'live',
                },
                'eventId': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 160,
                  'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                },
                'organizerId': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 2000,
                },
              },
            },
            'attendeeId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 180,
              'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
            },
          },
        },
        <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'kind',
            'routeId',
            'senderId',
          ],
          'properties': <String, Object?>{
            'kind': <String, Object?>{
              'type': 'string',
              'const': 'sender',
            },
            'routeId': <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'catchEventSms',
                'organizerEventWhatsapp',
                'catchEventRcs',
              ],
            },
            'senderId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 180,
              'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
            },
          },
        },
        <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'kind',
            'organizerId',
            'recipientEndpointId',
          ],
          'properties': <String, Object?>{
            'kind': <String, Object?>{
              'type': 'string',
              'const': 'whatsappEndpoint',
            },
            'organizerId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 180,
              'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
            },
            'recipientEndpointId': <String, Object?>{
              'type': 'string',
              'pattern': '^whatsapp:[a-f0-9]{64}\$',
            },
          },
        },
        <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'kind',
            'subscriptionId',
          ],
          'properties': <String, Object?>{
            'kind': <String, Object?>{
              'type': 'string',
              'const': 'rcsSubscription',
            },
            'subscriptionId': <String, Object?>{
              'type': 'string',
              'pattern': '^rcs-subscription:[a-f0-9]{64}\$',
            },
          },
        },
      ],
    },
    'expiresAt': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
    },
    'checkpoint': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'phase',
        'cursor',
        'visited',
        'dueAt',
        'failures',
        'retries',
      ],
      'properties': <String, Object?>{
        'phase': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'scan',
            'retry',
            'complete',
            'review',
            'expired',
          ],
        },
        'cursor': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 180,
              'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
            },
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
        'visited': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 10000,
        },
        'dueAt': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 9007199254740991,
            },
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
        'failures': <String, Object?>{
          'type': 'array',
          'maxItems': 100,
          'items': <String, Object?>{
            'oneOf': <Object?>[
              <String, Object?>{
                'type': 'object',
                'additionalProperties': false,
                'required': <Object?>[
                  'workItemId',
                  'reason',
                ],
                'properties': <String, Object?>{
                  'workItemId': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                    'maxLength': 180,
                    'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                  },
                  'reason': <String, Object?>{
                    'type': 'string',
                    'enum': <Object?>[
                      'busy',
                      'unavailable',
                    ],
                  },
                },
              },
              <String, Object?>{
                'type': 'object',
                'additionalProperties': false,
                'required': <Object?>[
                  'targetKey',
                  'reason',
                ],
                'properties': <String, Object?>{
                  'targetKey': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                    'maxLength': 180,
                    'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                  },
                  'reason': <String, Object?>{
                    'type': 'string',
                    'enum': <Object?>[
                      'busy',
                      'unavailable',
                    ],
                  },
                },
              },
            ],
          },
        },
        'retries': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 5,
        },
      },
    },
  },
};
