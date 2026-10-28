// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/organizer_contacts.schema.json.

const schemaOrganizerContactDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/organizer_contacts.schema.json',
  'title': 'OrganizerContactDocument',
  'description': 'Server-owned organizer-scoped contact projection. It is not a Consumer profile and may contain restricted operational contact data.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'organizerContacts',
  'x-firestore-path': 'organizerContacts/{contactId}',
  'x-document-id-field': 'contactId',
  'x-owner': 'organizer audience projection and manager-only CRM callables',
  'required': <Object?>[
    'organizerId',
    'displayName',
    'searchName',
    'linkedUid',
    'phoneE164',
    'email',
    'identityState',
    'identityConfidence',
    'primarySource',
    'ambiguousCandidateContactIds',
    'firstSeenAt',
    'lastSeenAt',
    'sourceCount',
    'whatsappStatus',
    'smsStatus',
    'revision',
    'mergedIntoContactId',
    'createdAt',
    'updatedAt',
    'deletedAt',
  ],
  'properties': <String, Object?>{
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'x-catch-ownership': 'server-only',
    },
    'displayName': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 120,
      'x-catch-ownership': 'server-only',
    },
    'displayNameOverride': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 1,
      'maxLength': 120,
      'x-catch-ownership': 'server-only',
      'description': 'Organizer-scoped label correction. It never changes the Consumer profile or a provider/roster source row.',
    },
    'searchName': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 120,
      'x-catch-ownership': 'server-only',
    },
    'linkedUid': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 1,
      'maxLength': 180,
      'x-catch-ownership': 'server-only',
    },
    'phoneE164': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'pattern': '^\\+[1-9][0-9]{7,14}\$',
      'x-catch-ownership': 'server-only',
    },
    'email': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'format': 'email',
      'maxLength': 320,
      'x-catch-ownership': 'server-only',
    },
    'identityState': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'unlinked',
        'verified',
        'ambiguous',
        'merged',
      ],
      'x-catch-ownership': 'server-only',
    },
    'identityConfidence': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'eventOnly',
        'proposed',
        'verified',
      ],
      'x-catch-ownership': 'server-only',
    },
    'primarySource': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'catchBooking',
        'hostImport',
        'hostManual',
        'webOtp',
        'providerSync',
        'hostForm',
      ],
      'x-catch-ownership': 'server-only',
    },
    'ambiguousCandidateContactIds': <String, Object?>{
      'type': 'array',
      'maxItems': 20,
      'uniqueItems': true,
      'items': <String, Object?>{
        'type': 'string',
        'minLength': 1,
        'maxLength': 180,
      },
      'x-catch-ownership': 'server-only',
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
      'x-catch-ownership': 'server-only',
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
      'x-catch-ownership': 'server-only',
    },
    'sourceCount': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 1000000,
      'x-catch-ownership': 'server-only',
    },
    'whatsappStatus': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'unknown',
        'optedIn',
        'optedOut',
      ],
      'x-catch-ownership': 'server-only',
    },
    'smsStatus': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'unknown',
        'optedIn',
        'optedOut',
      ],
      'x-catch-ownership': 'server-only',
    },
    'manualTagIds': <String, Object?>{
      'type': 'array',
      'maxItems': 5,
      'uniqueItems': true,
      'items': <String, Object?>{
        'type': 'string',
        'pattern': '^[a-f0-9]{32}\$',
      },
      'x-catch-ownership': 'server-only',
      'description': 'Organizer-authored manual CRM tag ids. These are distinct from computed segment ids in organizerContactTraits.',
    },
    'revision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
      'x-catch-ownership': 'server-only',
    },
    'mergedIntoContactId': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
      'x-catch-ownership': 'server-only',
    },
    'createdAt': <String, Object?>{
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
      'x-catch-ownership': 'server-only',
    },
    'updatedAt': <String, Object?>{
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
      'x-catch-ownership': 'server-only',
    },
    'deletedAt': <String, Object?>{
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
      'x-catch-ownership': 'server-only',
    },
    'hiddenAt': <String, Object?>{
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
      'x-catch-ownership': 'server-only',
      'description': 'Organizer-requested CRM hiding. Operational attendee and audit facts remain intact.',
    },
    'hiddenBy': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 1,
      'maxLength': 180,
      'x-catch-ownership': 'server-only',
    },
    'hiddenTraitSnapshot': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
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
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
      'x-catch-ownership': 'server-only',
      'description': 'Bounded organizer-audience contribution snapshot used only to restore a hidden contact without recomputing private event history.',
    },
  },
  'definitions': <String, Object?>{
    'channelStatus': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'unknown',
        'optedIn',
        'optedOut',
      ],
      'x-catch-ownership': 'server-only',
    },
  },
};
