// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/organizer_contact_traits.schema.json.

const schemaOrganizerContactTraitDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/organizer_contact_traits.schema.json',
  'title': 'OrganizerContactTraitDocument',
  'description': 'Rebuildable, explainable organizer-contact CRM traits. Sensitive Event Success answers are excluded by contract.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'organizerContactTraits',
  'x-firestore-path': 'organizerContactTraits/{contactId}',
  'x-document-id-field': 'contactId',
  'x-owner': 'organizer audience projection',
  'required': <Object?>[
    'organizerId',
    'contactId',
    'expectedEventCount',
    'attendedEventCount',
    'cancelledEventCount',
    'noShowCount',
    'importedEventCount',
    'referredRegistrationCount',
    'referredCheckedInCount',
    'referredCheckedIn365DayCount',
    'linkedAccount',
    'firstSeenAt',
    'lastSeenAt',
    'firstAttendedAt',
    'lastAttendedAt',
    'attendanceRate',
    'segmentIds',
    'definitionVersion',
    'whatsappStatus',
    'smsStatus',
    'sourceCoverage',
    'projectionVersion',
    'computedAt',
  ],
  'properties': <String, Object?>{
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'contactId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'expectedEventCount': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 1000000,
    },
    'attendedEventCount': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 1000000,
    },
    'cancelledEventCount': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 1000000,
    },
    'noShowCount': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 1000000,
    },
    'importedEventCount': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 1000000,
    },
    'referredRegistrationCount': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 1000000,
    },
    'referredCheckedInCount': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 1000000,
    },
    'referredCheckedIn365DayCount': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 1000000,
    },
    'linkedAccount': <String, Object?>{
      'type': 'boolean',
    },
    'firstSeenAt': <String, Object?>{
      'type': 'object',
      'description': 'Serialized Firestore Timestamp fixture shape.',
      'x-firestore-type': 'timestamp',
      'additionalProperties': false,
      'required': <Object?>[
        '_seconds',
        '_nanoseconds',
      ],
      'properties': <String, Object?>{
        '_seconds': <String, Object?>{
          'type': 'integer',
        },
        '_nanoseconds': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 999999999,
        },
      },
    },
    'lastSeenAt': <String, Object?>{
      'type': 'object',
      'description': 'Serialized Firestore Timestamp fixture shape.',
      'x-firestore-type': 'timestamp',
      'additionalProperties': false,
      'required': <Object?>[
        '_seconds',
        '_nanoseconds',
      ],
      'properties': <String, Object?>{
        '_seconds': <String, Object?>{
          'type': 'integer',
        },
        '_nanoseconds': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 999999999,
        },
      },
    },
    'firstAttendedAt': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'object',
          'description': 'Serialized Firestore Timestamp fixture shape.',
          'x-firestore-type': 'timestamp',
          'additionalProperties': false,
          'required': <Object?>[
            '_seconds',
            '_nanoseconds',
          ],
          'properties': <String, Object?>{
            '_seconds': <String, Object?>{
              'type': 'integer',
            },
            '_nanoseconds': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 999999999,
            },
          },
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'lastAttendedAt': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'object',
          'description': 'Serialized Firestore Timestamp fixture shape.',
          'x-firestore-type': 'timestamp',
          'additionalProperties': false,
          'required': <Object?>[
            '_seconds',
            '_nanoseconds',
          ],
          'properties': <String, Object?>{
            '_seconds': <String, Object?>{
              'type': 'integer',
            },
            '_nanoseconds': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 999999999,
            },
          },
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'attendanceRate': <String, Object?>{
      'type': <Object?>[
        'number',
        'null',
      ],
      'minimum': 0,
      'maximum': 1,
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
    'attended30DayCount': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 1000000,
    },
    'attended60DayCount': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 1000000,
    },
    'definitionVersion': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 1000,
    },
    'whatsappStatus': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'unknown',
        'optedIn',
        'optedOut',
      ],
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
    'projectionVersion': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 1000,
    },
    'computedAt': <String, Object?>{
      'type': 'object',
      'description': 'Serialized Firestore Timestamp fixture shape.',
      'x-firestore-type': 'timestamp',
      'additionalProperties': false,
      'required': <Object?>[
        '_seconds',
        '_nanoseconds',
      ],
      'properties': <String, Object?>{
        '_seconds': <String, Object?>{
          'type': 'integer',
        },
        '_nanoseconds': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 999999999,
        },
      },
    },
  },
  'definitions': <String, Object?>{
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
    'channelStatus': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'unknown',
        'optedIn',
        'optedOut',
      ],
    },
  },
};
