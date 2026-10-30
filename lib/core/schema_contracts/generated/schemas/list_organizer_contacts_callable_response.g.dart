// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/list_organizer_contacts_response.schema.json.

const schemaListOrganizerContactsCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/list_organizer_contacts_response.schema.json',
  'title': 'ListOrganizerContactsCallableResponse',
  'description': 'Safe manager-only organizer contact rows and opaque pagination state.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'organizerId',
    'contacts',
    'nextCursor',
    'matchCount',
    'matchCountCoverage',
    'sourceCoverage',
    'projectionVersion',
  ],
  'properties': <String, Object?>{
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'contacts': <String, Object?>{
      'type': 'array',
      'maxItems': 100,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'contactId',
          'displayName',
          'phoneE164',
          'email',
          'identityState',
          'identityConfidence',
          'ambiguousCandidateCount',
          'attendedEventCount',
          'expectedEventCount',
          'lastAttendedAtMillis',
          'segmentIds',
          'whatsappStatus',
          'whatsappAdminSuppressed',
          'smsStatus',
          'sourceCoverage',
          'revision',
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
          'phoneE164': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
            'pattern': '^\\+[1-9][0-9]{7,14}\$',
          },
          'email': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
            'format': 'email',
            'maxLength': 320,
          },
          'identityState': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'unlinked',
              'verified',
              'ambiguous',
            ],
          },
          'identityConfidence': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'eventOnly',
              'proposed',
              'verified',
            ],
          },
          'ambiguousCandidateCount': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
            'maximum': 20,
          },
          'attendedEventCount': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
            'maximum': 1000000,
          },
          'expectedEventCount': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
            'maximum': 1000000,
          },
          'lastAttendedAtMillis': <String, Object?>{
            'type': <Object?>[
              'integer',
              'null',
            ],
            'minimum': 0,
          },
          'segmentIds': <String, Object?>{
            'type': 'array',
            'uniqueItems': true,
            'maxItems': 16,
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
          'manualTags': <String, Object?>{
            'type': 'array',
            'uniqueItems': true,
            'maxItems': 5,
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
                  'pattern': '^[a-f0-9]{32}\$',
                },
                'label': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 40,
                },
              },
            },
          },
          'whatsappStatus': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'unknown',
              'optedIn',
              'optedOut',
            ],
          },
          'whatsappAdminSuppressed': <String, Object?>{
            'type': 'boolean',
          },
          'smsStatus': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'unknown',
              'optedIn',
              'optedOut',
            ],
          },
          'sourceCoverage': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'exact',
              'partial',
              'insufficientData',
            ],
          },
          'revision': <String, Object?>{
            'type': 'integer',
            'minimum': 1,
            'maximum': 9007199254740991,
          },
          'membership': <String, Object?>{
            'description': 'CRM projection of one contact\'s paid membership with the organizer, through the contact\'s linked account.',
            'type': <Object?>[
              'object',
              'null',
            ],
            'additionalProperties': false,
            'required': <Object?>[
              'planId',
              'planName',
              'status',
              'memberSinceMillis',
              'entitled',
            ],
            'properties': <String, Object?>{
              'planId': <String, Object?>{
                'type': 'string',
                'pattern': '^hmp_[A-Za-z0-9]{20}\$',
              },
              'planName': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 60,
              },
              'status': <String, Object?>{
                'enum': <Object?>[
                  'trialing',
                  'active',
                  'past_due',
                  'paused',
                  'canceling',
                  'expired',
                ],
              },
              'memberSinceMillis': <String, Object?>{
                'type': <Object?>[
                  'integer',
                  'null',
                ],
                'minimum': 0,
                'maximum': 9007199254740991,
              },
              'entitled': <String, Object?>{
                'type': 'boolean',
              },
            },
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
    'matchCount': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 1000000,
    },
    'matchCountCoverage': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'exact',
        'atLeast',
      ],
    },
    'manualTagVocabulary': <String, Object?>{
      'type': 'array',
      'maxItems': 20,
      'uniqueItems': true,
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
            'pattern': '^[a-f0-9]{32}\$',
          },
          'label': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 40,
          },
        },
      },
    },
    'sourceCoverage': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'exact',
        'partial',
      ],
    },
    'projectionVersion': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 1000,
    },
  },
  'definitions': <String, Object?>{
    'contact': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'contactId',
        'displayName',
        'phoneE164',
        'email',
        'identityState',
        'identityConfidence',
        'ambiguousCandidateCount',
        'attendedEventCount',
        'expectedEventCount',
        'lastAttendedAtMillis',
        'segmentIds',
        'whatsappStatus',
        'whatsappAdminSuppressed',
        'smsStatus',
        'sourceCoverage',
        'revision',
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
        'phoneE164': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'pattern': '^\\+[1-9][0-9]{7,14}\$',
        },
        'email': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'format': 'email',
          'maxLength': 320,
        },
        'identityState': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'unlinked',
            'verified',
            'ambiguous',
          ],
        },
        'identityConfidence': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'eventOnly',
            'proposed',
            'verified',
          ],
        },
        'ambiguousCandidateCount': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 20,
        },
        'attendedEventCount': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 1000000,
        },
        'expectedEventCount': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 1000000,
        },
        'lastAttendedAtMillis': <String, Object?>{
          'type': <Object?>[
            'integer',
            'null',
          ],
          'minimum': 0,
        },
        'segmentIds': <String, Object?>{
          'type': 'array',
          'uniqueItems': true,
          'maxItems': 16,
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
        'manualTags': <String, Object?>{
          'type': 'array',
          'uniqueItems': true,
          'maxItems': 5,
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
                'pattern': '^[a-f0-9]{32}\$',
              },
              'label': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 40,
              },
            },
          },
        },
        'whatsappStatus': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'unknown',
            'optedIn',
            'optedOut',
          ],
        },
        'whatsappAdminSuppressed': <String, Object?>{
          'type': 'boolean',
        },
        'smsStatus': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'unknown',
            'optedIn',
            'optedOut',
          ],
        },
        'sourceCoverage': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'exact',
            'partial',
            'insufficientData',
          ],
        },
        'revision': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
          'maximum': 9007199254740991,
        },
        'membership': <String, Object?>{
          'description': 'CRM projection of one contact\'s paid membership with the organizer, through the contact\'s linked account.',
          'type': <Object?>[
            'object',
            'null',
          ],
          'additionalProperties': false,
          'required': <Object?>[
            'planId',
            'planName',
            'status',
            'memberSinceMillis',
            'entitled',
          ],
          'properties': <String, Object?>{
            'planId': <String, Object?>{
              'type': 'string',
              'pattern': '^hmp_[A-Za-z0-9]{20}\$',
            },
            'planName': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 60,
            },
            'status': <String, Object?>{
              'enum': <Object?>[
                'trialing',
                'active',
                'past_due',
                'paused',
                'canceling',
                'expired',
              ],
            },
            'memberSinceMillis': <String, Object?>{
              'type': <Object?>[
                'integer',
                'null',
              ],
              'minimum': 0,
              'maximum': 9007199254740991,
            },
            'entitled': <String, Object?>{
              'type': 'boolean',
            },
          },
        },
      },
    },
  },
};
