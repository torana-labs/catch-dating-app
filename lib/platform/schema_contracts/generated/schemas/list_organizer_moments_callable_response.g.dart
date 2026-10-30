// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/list_organizer_moments_response.schema.json.

const schemaListOrganizerMomentsCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/list_organizer_moments_response.schema.json',
  'title': 'ListOrganizerMomentsCallableResponse',
  'description': 'All moments for one scope, sorted by momentId.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'moments',
  ],
  'properties': <String, Object?>{
    'moments': <String, Object?>{
      'type': 'array',
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'momentId',
          'scope',
          'name',
          'initiation',
          'sense',
          'audience',
          'action',
          'status',
          'approval',
          'origin',
          'revision',
        ],
        'properties': <String, Object?>{
          'momentId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
          },
          'scope': <String, Object?>{
            'type': 'object',
            'additionalProperties': false,
            'required': <Object?>[
              'kind',
            ],
            'properties': <String, Object?>{
              'kind': <String, Object?>{
                'type': 'string',
                'enum': <Object?>[
                  'event',
                  'program',
                  'organizer',
                ],
              },
              'eventId': <String, Object?>{
                'type': <Object?>[
                  'string',
                  'null',
                ],
                'minLength': 1,
                'maxLength': 180,
                'description': 'Required when kind=event; must be null otherwise.',
              },
              'programId': <String, Object?>{
                'type': <Object?>[
                  'string',
                  'null',
                ],
                'minLength': 1,
                'maxLength': 180,
                'description': 'Required when kind=program; must be null otherwise.',
              },
              'organizerId': <String, Object?>{
                'type': <Object?>[
                  'string',
                  'null',
                ],
                'minLength': 1,
                'maxLength': 180,
                'description': 'Required when kind=organizer; must be null otherwise. Organizer scope hosts server-managed form-automation companion moments.',
              },
            },
          },
          'name': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 140,
          },
          'initiation': <String, Object?>{
            'type': 'object',
            'additionalProperties': false,
            'required': <Object?>[
              'kind',
            ],
            'properties': <String, Object?>{
              'kind': <String, Object?>{
                'type': 'string',
                'enum': <Object?>[
                  'manual',
                  'scheduled',
                  'anchored',
                  'triggered',
                ],
              },
              'atMillis': <String, Object?>{
                'type': <Object?>[
                  'integer',
                  'null',
                ],
                'minimum': 0,
                'maximum': 9007199254740991,
                'description': 'Scheduled fire time; required when kind=scheduled.',
              },
              'anchorKind': <String, Object?>{
                'anyOf': <Object?>[
                  <String, Object?>{
                    'type': 'string',
                    'enum': <Object?>[
                      'scopeStart',
                      'scopeEnd',
                      'functionStart',
                      'functionEnd',
                      'rsvpDeadline',
                      'travelLegTime',
                    ],
                  },
                  <String, Object?>{
                    'type': 'null',
                  },
                ],
                'description': 'Required when kind=anchored.',
              },
              'anchorId': <String, Object?>{
                'type': <Object?>[
                  'string',
                  'null',
                ],
                'maxLength': 180,
                'description': 'Function/leg id for scoped anchors; null anchors to the scope itself.',
              },
              'offsetMinutes': <String, Object?>{
                'type': <Object?>[
                  'integer',
                  'null',
                ],
                'minimum': -43200,
                'maximum': 43200,
                'description': 'Minutes relative to the anchor; negative is before. Applied as an absolute-time shift after any calendar offset.',
              },
              'offsetDays': <String, Object?>{
                'type': <Object?>[
                  'integer',
                  'null',
                ],
                'minimum': -731,
                'maximum': 731,
                'description': 'Calendar days relative to the anchor in the scope\'s timezone, preserving the anchor\'s local wall-clock time; negative is before. Applied after offsetMonths, before offsetMinutes.',
              },
              'offsetMonths': <String, Object?>{
                'type': <Object?>[
                  'integer',
                  'null',
                ],
                'minimum': -24,
                'maximum': 24,
                'description': 'Calendar months relative to the anchor in the scope\'s timezone, preserving local wall-clock time; the day-of-month clamps to the target month\'s length. Negative is before. Applied first.',
              },
              'triggerKind': <String, Object?>{
                'anyOf': <Object?>[
                  <String, Object?>{
                    'type': 'string',
                    'enum': <Object?>[
                      'lateArrivalAtHotel',
                      'flightDisrupted',
                      'formAutomation',
                    ],
                  },
                  <String, Object?>{
                    'type': 'null',
                  },
                ],
                'description': 'Required when kind=triggered.',
              },
              'functionId': <String, Object?>{
                'type': <Object?>[
                  'string',
                  'null',
                ],
                'maxLength': 180,
                'description': 'Optional function scope for triggered moments.',
              },
              'automation': <String, Object?>{
                'anyOf': <Object?>[
                  <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'ruleId',
                      'ruleRevision',
                      'actionId',
                      'recipeCampaignId',
                      'recipeRevision',
                    ],
                    'properties': <String, Object?>{
                      'ruleId': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 160,
                        'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                      },
                      'ruleRevision': <String, Object?>{
                        'type': 'integer',
                        'minimum': 1,
                        'maximum': 1000000,
                      },
                      'actionId': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 160,
                        'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                      },
                      'recipeCampaignId': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 160,
                        'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                      },
                      'recipeRevision': <String, Object?>{
                        'type': 'integer',
                        'minimum': 1,
                        'maximum': 1000000,
                      },
                    },
                  },
                  <String, Object?>{
                    'type': 'null',
                  },
                ],
                'description': 'Server-managed binding to the form-automation rule action; required when triggerKind=formAutomation. The rule stays the authored object — this projection carries its approved revision pins.',
              },
            },
          },
          'sense': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'individual',
              'audience',
            ],
          },
          'audience': <String, Object?>{
            'type': 'object',
            'additionalProperties': false,
            'required': <Object?>[
              'kind',
            ],
            'properties': <String, Object?>{
              'kind': <String, Object?>{
                'type': 'string',
                'enum': <Object?>[
                  'subject',
                  'eventParticipants',
                  'functionGuests',
                  'households',
                  'staffDuty',
                ],
              },
              'statuses': <String, Object?>{
                'type': <Object?>[
                  'array',
                  'null',
                ],
                'maxItems': 4,
                'uniqueItems': true,
                'items': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'signedUp',
                  ],
                },
                'description': 'eventParticipants: participation statuses included.',
              },
              'functionId': <String, Object?>{
                'type': <Object?>[
                  'string',
                  'null',
                ],
                'maxLength': 180,
                'description': 'functionGuests: the function whose guests resolve.',
              },
              'rsvp': <String, Object?>{
                'type': <Object?>[
                  'array',
                  'null',
                ],
                'maxItems': 4,
                'uniqueItems': true,
                'items': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'attending',
                    'maybe',
                  ],
                },
                'description': 'functionGuests: RSVP states included.',
              },
              'householdDedupe': <String, Object?>{
                'type': <Object?>[
                  'boolean',
                  'null',
                ],
                'description': 'functionGuests: one send per household when true (default).',
              },
              'travelTimeLead': <String, Object?>{
                'type': <Object?>[
                  'boolean',
                  'null',
                ],
                'description': 'functionGuests: shift each recipient\'s due time earlier by their hotel→function travel estimate (hotel comes from the guest\'s hotel-linked group). Legal only on program scopes.',
              },
              'rsvpPendingOnly': <String, Object?>{
                'type': <Object?>[
                  'boolean',
                  'null',
                ],
                'description': 'households: restrict to households with a pending member.',
              },
              'duty': <String, Object?>{
                'type': <Object?>[
                  'string',
                  'null',
                ],
                'maxLength': 80,
                'description': 'staffDuty: duty whose grant holders resolve.',
              },
              'scopeIds': <String, Object?>{
                'type': <Object?>[
                  'array',
                  'null',
                ],
                'maxItems': 50,
                'uniqueItems': true,
                'items': <String, Object?>{
                  'type': 'string',
                  'maxLength': 180,
                },
                'description': 'staffDuty: optional function/pickupPoint/hotel ids; null means all.',
              },
            },
          },
          'action': <String, Object?>{
            'type': 'object',
            'additionalProperties': false,
            'required': <Object?>[
              'kind',
            ],
            'properties': <String, Object?>{
              'kind': <String, Object?>{
                'type': 'string',
                'enum': <Object?>[
                  'sendTemplate',
                  'push',
                  'staffAttention',
                ],
              },
              'connectionId': <String, Object?>{
                'type': <Object?>[
                  'string',
                  'null',
                ],
                'maxLength': 180,
                'description': 'sendTemplate: organizerSenderConnections doc id.',
              },
              'templateId': <String, Object?>{
                'type': <Object?>[
                  'string',
                  'null',
                ],
                'maxLength': 180,
                'description': 'sendTemplate: organizerMessageTemplates doc id.',
              },
              'variables': <String, Object?>{
                'type': <Object?>[
                  'object',
                  'null',
                ],
                'additionalProperties': <String, Object?>{
                  'type': 'string',
                  'maxLength': 1000,
                },
                'description': 'sendTemplate: template variable substitutions.',
              },
              'notificationType': <String, Object?>{
                'type': <Object?>[
                  'string',
                  'null',
                ],
                'maxLength': 80,
                'description': 'push: activity/push type written to the feed.',
              },
              'preferenceKey': <String, Object?>{
                'type': <Object?>[
                  'string',
                  'null',
                ],
                'maxLength': 80,
                'description': 'push: user notification preference gating FCM.',
              },
              'duty': <String, Object?>{
                'type': <Object?>[
                  'string',
                  'null',
                ],
                'maxLength': 80,
                'description': 'staffAttention: duty the attention item targets.',
              },
              'severity': <String, Object?>{
                'type': <Object?>[
                  'string',
                  'null',
                ],
                'enum': <Object?>[
                  'info',
                  'warning',
                  'urgent',
                  null,
                ],
                'description': 'staffAttention: attention severity.',
              },
              'titleTemplate': <String, Object?>{
                'type': <Object?>[
                  'string',
                  'null',
                ],
                'maxLength': 200,
                'description': 'staffAttention: rendered attention title.',
              },
            },
          },
          'status': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'draft',
              'armed',
              'paused',
              'done',
            ],
          },
          'approval': <String, Object?>{
            'type': <Object?>[
              'object',
              'null',
            ],
            'additionalProperties': false,
            'required': <Object?>[
              'approvedByUid',
              'approvedAtMillis',
            ],
            'properties': <String, Object?>{
              'approvedByUid': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 180,
              },
              'approvedAtMillis': <String, Object?>{
                'type': 'integer',
                'minimum': 0,
                'maximum': 9007199254740991,
              },
            },
            'description': 'Approve-the-rule-once record; required while armed.',
          },
          'origin': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'organizer',
              'systemDefault',
              'formAutomation',
            ],
          },
          'revision': <String, Object?>{
            'type': 'integer',
            'minimum': 1,
            'maximum': 9007199254740991,
          },
        },
        'description': 'The full moment definition returned by moment callables.',
      },
    },
  },
};
