// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/list_organizer_saved_audiences_response.schema.json.

const schemaListOrganizerSavedAudiencesCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/list_organizer_saved_audiences_response.schema.json',
  'title': 'ListOrganizerSavedAudiencesCallableResponse',
  'description': 'One bounded page of reusable organizer CRM audiences.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'organizerId',
    'audiences',
    'nextCursor',
  ],
  'properties': <String, Object?>{
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'audiences': <String, Object?>{
      'type': 'array',
      'maxItems': 50,
      'items': <String, Object?>{
        'title': 'OrganizerSavedAudienceCallableResponse',
        'description': 'Sanitized reusable organizer CRM audience definition.',
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'organizerId',
          'audienceId',
          'scope',
          'name',
          'status',
          'definition',
          'definitionHash',
          'definitionVersion',
          'revision',
          'lastPreviewMatchCount',
          'lastPreviewReachSummary',
          'lastPreviewAtMillis',
          'createdAtMillis',
          'updatedAtMillis',
        ],
        'properties': <String, Object?>{
          'organizerId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
          },
          'audienceId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
          },
          'scope': <String, Object?>{
            'const': 'organizerCrm',
          },
          'name': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 80,
          },
          'status': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'active',
              'archived',
            ],
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
          'definitionHash': <String, Object?>{
            'type': 'string',
            'pattern': '^[a-f0-9]{64}\$',
          },
          'definitionVersion': <String, Object?>{
            'type': 'integer',
            'minimum': 1,
            'maximum': 1000,
          },
          'revision': <String, Object?>{
            'type': 'integer',
            'minimum': 1,
            'maximum': 9007199254740991,
          },
          'lastPreviewMatchCount': <String, Object?>{
            'type': <Object?>[
              'integer',
              'null',
            ],
            'minimum': 0,
            'maximum': 2500,
          },
          'lastPreviewReachSummary': <String, Object?>{
            'oneOf': <Object?>[
              <String, Object?>{
                'type': 'null',
              },
              <String, Object?>{
                'type': 'object',
                'additionalProperties': false,
                'required': <Object?>[
                  'inCatch',
                  'automatic',
                  'byHand',
                  'unavailable',
                ],
                'properties': <String, Object?>{
                  'inCatch': <String, Object?>{
                    'type': 'integer',
                    'minimum': 0,
                    'maximum': 2500,
                  },
                  'automatic': <String, Object?>{
                    'type': 'integer',
                    'minimum': 0,
                    'maximum': 2500,
                  },
                  'byHand': <String, Object?>{
                    'type': 'integer',
                    'minimum': 0,
                    'maximum': 2500,
                  },
                  'unavailable': <String, Object?>{
                    'type': 'integer',
                    'minimum': 0,
                    'maximum': 2500,
                  },
                },
              },
            ],
          },
          'lastPreviewAtMillis': <String, Object?>{
            'type': <Object?>[
              'integer',
              'null',
            ],
            'minimum': 0,
          },
          'createdAtMillis': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
          },
          'updatedAtMillis': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
          },
        },
      },
    },
    'nextCursor': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 1000,
    },
    'filterOptions': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'forms',
        'questions',
        'events',
        'tags',
      ],
      'properties': <String, Object?>{
        'forms': <String, Object?>{
          'type': 'array',
          'maxItems': 400,
          'items': <String, Object?>{
            'type': 'object',
            'additionalProperties': false,
            'required': <Object?>[
              'formId',
              'title',
            ],
            'properties': <String, Object?>{
              'formId': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 180,
              },
              'title': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 240,
              },
            },
          },
        },
        'questions': <String, Object?>{
          'type': 'array',
          'maxItems': 100,
          'items': <String, Object?>{
            'type': 'object',
            'additionalProperties': false,
            'required': <Object?>[
              'formId',
              'versionId',
              'version',
              'formTitle',
              'questionId',
              'label',
              'kind',
              'options',
            ],
            'properties': <String, Object?>{
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
              'version': <String, Object?>{
                'type': 'integer',
                'minimum': 1,
              },
              'formTitle': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 240,
              },
              'questionId': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 180,
              },
              'label': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 240,
              },
              'kind': <String, Object?>{
                'type': 'string',
                'enum': <Object?>[
                  'singleChoice',
                  'multiChoice',
                  'boolean',
                ],
              },
              'options': <String, Object?>{
                'type': 'array',
                'maxItems': 100,
                'items': <String, Object?>{
                  'type': 'object',
                  'additionalProperties': false,
                  'required': <Object?>[
                    'label',
                    'value',
                  ],
                  'properties': <String, Object?>{
                    'label': <String, Object?>{
                      'type': 'string',
                      'minLength': 1,
                      'maxLength': 240,
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
              },
              'activeVersion': <String, Object?>{
                'type': 'boolean',
              },
            },
          },
        },
        'events': <String, Object?>{
          'type': 'array',
          'maxItems': 200,
          'items': <String, Object?>{
            'type': 'object',
            'additionalProperties': false,
            'required': <Object?>[
              'eventId',
              'title',
            ],
            'properties': <String, Object?>{
              'eventId': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 180,
              },
              'title': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 240,
              },
            },
          },
        },
        'tags': <String, Object?>{
          'type': 'array',
          'maxItems': 20,
          'items': <String, Object?>{
            'type': 'object',
            'additionalProperties': false,
            'required': <Object?>[
              'tagId',
              'label',
            ],
            'properties': <String, Object?>{
              'tagId': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 180,
              },
              'label': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 240,
              },
            },
          },
        },
      },
    },
  },
};
