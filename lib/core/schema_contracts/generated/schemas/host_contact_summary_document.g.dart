// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/host_contact_summaries.schema.json.

const schemaHostContactSummaryDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/host_contact_summaries.schema.json',
  'title': 'HostContactSummaryDocument',
  'description': 'Server-maintained organizer-scoped Host read view. Never identity, permission or mutation authority.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'hostContactSummaries',
  'x-firestore-path': 'hostContactSummaries/{contactId}',
  'x-document-id-field': 'contactId',
  'x-owner': 'Host read model projector',
  'required': <Object?>[
    'organizerId',
    'contactId',
    'searchName',
    'lastSeenAtMillis',
    'manualTagIds',
    'linkedAccount',
    'importedContact',
    'row',
    'version',
  ],
  'properties': <String, Object?>{
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'x-catch-ownership': 'server-only',
    },
    'contactId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'x-catch-ownership': 'server-only',
    },
    'searchName': <String, Object?>{
      'type': 'string',
      'maxLength': 320,
      'x-catch-ownership': 'server-only',
    },
    'lastSeenAtMillis': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
      'x-catch-ownership': 'server-only',
    },
    'manualTagIds': <String, Object?>{
      'type': 'array',
      'maxItems': 5,
      'uniqueItems': true,
      'items': <String, Object?>{
        'type': 'string',
        'maxLength': 32,
      },
      'x-catch-ownership': 'server-only',
    },
    'linkedAccount': <String, Object?>{
      'type': 'boolean',
      'x-catch-ownership': 'server-only',
    },
    'importedContact': <String, Object?>{
      'type': 'boolean',
      'x-catch-ownership': 'server-only',
    },
    'row': <String, Object?>{
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
      'x-catch-ownership': 'server-only',
    },
    'version': <String, Object?>{
      'const': 1,
      'x-catch-ownership': 'server-only',
    },
  },
};
