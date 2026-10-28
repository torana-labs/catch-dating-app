// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/upsert_organizer_saved_audience_payload.schema.json.

const schemaUpsertOrganizerSavedAudienceCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/upsert_organizer_saved_audience_payload.schema.json',
  'title': 'UpsertOrganizerSavedAudienceCallablePayload',
  'description': 'Creates or revision-updates one reusable Customers-owned CRM audience.',
  'x-callable-aliases': <Object?>[
    'upsertOrganizerSavedAudience',
  ],
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'organizerId',
    'requestId',
    'scope',
    'name',
    'definition',
  ],
  'properties': <String, Object?>{
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'audienceId': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 1,
      'maxLength': 180,
    },
    'requestId': <String, Object?>{
      'type': 'string',
      'minLength': 8,
      'maxLength': 120,
    },
    'expectedRevision': <String, Object?>{
      'type': <Object?>[
        'integer',
        'null',
      ],
      'minimum': 1,
      'maximum': 9007199254740991,
    },
    'scope': <String, Object?>{
      'const': 'organizerCrm',
    },
    'name': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 80,
    },
    'definition': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'join',
        'predicates',
      ],
      'properties': <String, Object?>{
        'join': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'all',
            'any',
          ],
        },
        'predicates': <String, Object?>{
          'type': 'array',
          'minItems': 1,
          'maxItems': 8,
          'items': <String, Object?>{
            'oneOf': <Object?>[
              <String, Object?>{
                'type': 'object',
                'additionalProperties': false,
                'required': <Object?>[
                  'kind',
                  'segmentId',
                ],
                'properties': <String, Object?>{
                  'kind': <String, Object?>{
                    'const': 'computedSegment',
                  },
                  'segmentId': <String, Object?>{
                    'type': 'string',
                    'enum': <Object?>[
                      'new_to_organizer',
                      'past_attendee',
                      'first_time_attendee',
                      'repeat_attendee',
                      'regular',
                      'lapsed_regular',
                      'reliable_attendee',
                      'needs_confirmation',
                      'advocate',
                      'high_impact_advocate',
                      'whatsapp_reachable',
                      'sms_reachable',
                      'active_member',
                      'lapsed_member',
                      'member_no_recent_attendance',
                      'frequent_non_member',
                    ],
                  },
                },
              },
              <String, Object?>{
                'type': 'object',
                'additionalProperties': false,
                'required': <Object?>[
                  'kind',
                  'manualTagId',
                ],
                'properties': <String, Object?>{
                  'kind': <String, Object?>{
                    'const': 'manualTag',
                  },
                  'manualTagId': <String, Object?>{
                    'type': 'string',
                    'pattern': '^[a-f0-9]{32}\$',
                  },
                },
              },
              <String, Object?>{
                'type': 'object',
                'additionalProperties': false,
                'required': <Object?>[
                  'kind',
                  'operator',
                  'eventCount',
                ],
                'properties': <String, Object?>{
                  'kind': <String, Object?>{
                    'const': 'attendanceCount',
                  },
                  'operator': <String, Object?>{
                    'type': 'string',
                    'enum': <Object?>[
                      'atLeast',
                      'atMost',
                    ],
                  },
                  'eventCount': <String, Object?>{
                    'type': 'integer',
                    'minimum': 0,
                    'maximum': 10000,
                  },
                },
              },
              <String, Object?>{
                'type': 'object',
                'additionalProperties': false,
                'required': <Object?>[
                  'kind',
                  'days',
                ],
                'properties': <String, Object?>{
                  'kind': <String, Object?>{
                    'const': 'lastSeenWithinDays',
                  },
                  'days': <String, Object?>{
                    'type': 'integer',
                    'minimum': 1,
                    'maximum': 3650,
                  },
                },
              },
              <String, Object?>{
                'type': 'object',
                'additionalProperties': false,
                'required': <Object?>[
                  'kind',
                  'intent',
                ],
                'properties': <String, Object?>{
                  'kind': <String, Object?>{
                    'const': 'reachableForIntent',
                  },
                  'intent': <String, Object?>{
                    'const': 'organizerWhatsappCampaign',
                  },
                },
              },
              <String, Object?>{
                'type': 'object',
                'additionalProperties': false,
                'required': <Object?>[
                  'kind',
                  'formId',
                  'reviewStatus',
                ],
                'properties': <String, Object?>{
                  'kind': <String, Object?>{
                    'const': 'applicationStatus',
                  },
                  'formId': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                    'maxLength': 180,
                  },
                  'reviewStatus': <String, Object?>{
                    'type': 'string',
                    'enum': <Object?>[
                      'submitted',
                      'inReview',
                      'approved',
                      'waitlisted',
                      'declined',
                    ],
                  },
                },
              },
              <String, Object?>{
                'type': 'object',
                'additionalProperties': false,
                'required': <Object?>[
                  'kind',
                  'formId',
                  'versionId',
                  'questionId',
                  'value',
                ],
                'properties': <String, Object?>{
                  'kind': <String, Object?>{
                    'const': 'formAnswer',
                  },
                  'formId': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                    'maxLength': 180,
                  },
                  'versionId': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                    'maxLength': 180,
                  },
                  'questionId': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                    'maxLength': 180,
                  },
                  'value': <String, Object?>{
                    'type': <Object?>[
                      'string',
                      'boolean',
                    ],
                    'minLength': 1,
                    'maxLength': 160,
                  },
                },
              },
              <String, Object?>{
                'type': 'object',
                'additionalProperties': false,
                'required': <Object?>[
                  'kind',
                  'eventId',
                ],
                'properties': <String, Object?>{
                  'kind': <String, Object?>{
                    'const': 'attendedEvent',
                  },
                  'eventId': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                    'maxLength': 180,
                  },
                },
              },
              <String, Object?>{
                'type': 'object',
                'additionalProperties': false,
                'required': <Object?>[
                  'kind',
                  'operator',
                  'currency',
                  'amountMinor',
                  'withinDays',
                ],
                'properties': <String, Object?>{
                  'kind': <String, Object?>{
                    'const': 'spend',
                  },
                  'operator': <String, Object?>{
                    'type': 'string',
                    'enum': <Object?>[
                      'atLeast',
                      'atMost',
                    ],
                  },
                  'currency': <String, Object?>{
                    'type': 'string',
                    'pattern': '^[A-Z]{3}\$',
                  },
                  'amountMinor': <String, Object?>{
                    'type': 'integer',
                    'minimum': 0,
                    'maximum': 10000000000,
                  },
                  'withinDays': <String, Object?>{
                    'type': <Object?>[
                      'integer',
                      'null',
                    ],
                    'minimum': 1,
                    'maximum': 3650,
                  },
                },
              },
              <String, Object?>{
                'type': 'object',
                'additionalProperties': false,
                'required': <Object?>[
                  'kind',
                  'contactIds',
                ],
                'properties': <String, Object?>{
                  'kind': <String, Object?>{
                    'const': 'staticMembers',
                  },
                  'contactIds': <String, Object?>{
                    'type': 'array',
                    'minItems': 0,
                    'maxItems': 2500,
                    'uniqueItems': true,
                    'items': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 180,
                    },
                  },
                },
              },
              <String, Object?>{
                'type': 'object',
                'additionalProperties': false,
                'required': <Object?>[
                  'kind',
                  'segmentIds',
                  'manualTagIds',
                ],
                'properties': <String, Object?>{
                  'kind': <String, Object?>{
                    'const': 'directoryFilters',
                  },
                  'segmentIds': <String, Object?>{
                    'type': 'array',
                    'maxItems': 12,
                    'uniqueItems': true,
                    'items': <String, Object?>{
                      'type': 'string',
                      'enum': <Object?>[
                        'new_to_organizer',
                        'past_attendee',
                        'first_time_attendee',
                        'repeat_attendee',
                        'regular',
                        'lapsed_regular',
                        'reliable_attendee',
                        'needs_confirmation',
                        'advocate',
                        'high_impact_advocate',
                        'whatsapp_reachable',
                        'sms_reachable',
                        'active_member',
                        'lapsed_member',
                        'member_no_recent_attendance',
                        'frequent_non_member',
                      ],
                    },
                  },
                  'manualTagIds': <String, Object?>{
                    'type': 'array',
                    'maxItems': 20,
                    'uniqueItems': true,
                    'items': <String, Object?>{
                      'type': 'string',
                      'pattern': '^[a-f0-9]{32}\$',
                    },
                  },
                },
              },
            ],
          },
        },
      },
    },
  },
};
