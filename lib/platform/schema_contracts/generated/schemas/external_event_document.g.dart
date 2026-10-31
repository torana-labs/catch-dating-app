// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/external_events.schema.json.

const schemaExternalEventDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/external_events.schema.json',
  'title': 'ExternalEventDocument',
  'description': 'Read-only external event document stored at externalEvents/{eventId}. These records are sourced from events Supply Intake imported for a published organizer and may link to external booking platforms, but they never enable Catch booking, payments, reservations, waitlists, attendance, or schedule locks.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'externalEvents',
  'x-firestore-path': 'externalEvents/{eventId}',
  'x-document-id-field': 'eventId',
  'x-owner': 'organizer intake import tooling after admin review; external source corrections and takedowns are admin-owned',
  'required': <Object?>[
    'schemaVersion',
    'eventId',
    'canonicalHostId',
    'title',
    'description',
    'startTime',
    'endTime',
    'timezone',
    'meetingPoint',
    'meetingLocation',
    'locationDetails',
    'photoUrl',
    'activity',
    'price',
    'status',
    'publicationStatus',
    'organizerCapabilities',
    'booking',
    'discovery',
    'dedupe',
    'externalSource',
    'review',
    'createdAt',
    'updatedAt',
  ],
  'properties': <String, Object?>{
    'schemaVersion': <String, Object?>{
      'type': 'integer',
      'const': 1,
    },
    'eventId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'canonicalHostId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'title': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 240,
    },
    'description': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 4000,
    },
    'startTime': <String, Object?>{
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
    'endTime': <String, Object?>{
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
    'timezone': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 80,
    },
    'meetingPoint': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 240,
    },
    'meetingLocation': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'name',
        'address',
        'placeId',
        'latitude',
        'longitude',
        'notes',
      ],
      'properties': <String, Object?>{
        'name': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 240,
        },
        'address': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'maxLength': 500,
        },
        'placeId': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'minLength': 1,
          'maxLength': 256,
        },
        'latitude': <String, Object?>{
          'type': <Object?>[
            'number',
            'null',
          ],
          'minimum': -90,
          'maximum': 90,
        },
        'longitude': <String, Object?>{
          'type': <Object?>[
            'number',
            'null',
          ],
          'minimum': -180,
          'maximum': 180,
        },
        'notes': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'maxLength': 1000,
        },
      },
    },
    'locationDetails': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 1000,
    },
    'photoUrl': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'format': 'uri',
          'maxLength': 2048,
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'activity': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'version',
        'activityKind',
        'interactionModel',
        'source',
      ],
      'properties': <String, Object?>{
        'version': <String, Object?>{
          'type': 'integer',
          'const': 1,
        },
        'activityKind': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'socialRun',
            'running',
            'walking',
            'pickleball',
            'padel',
            'tennis',
            'badminton',
            'cycling',
            'spinClass',
            'yoga',
            'strengthTraining',
            'pubQuiz',
            'barCrawl',
            'dinner',
            'singlesMixer',
            'openActivity',
          ],
        },
        'interactionModel': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'pacePods',
            'pairedRotations',
            'teamRotations',
            'seatedTable',
            'freeFormMixer',
            'hostLedProgram',
            'openFormat',
          ],
        },
        'source': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'heuristic',
            'admin',
            'source',
          ],
        },
      },
    },
    'price': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'displayText',
        'parsedPriceInPaise',
        'currency',
      ],
      'properties': <String, Object?>{
        'displayText': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'maxLength': 120,
        },
        'parsedPriceInPaise': <String, Object?>{
          'type': <Object?>[
            'integer',
            'null',
          ],
          'minimum': 0,
          'maximum': 100000000,
        },
        'currency': <String, Object?>{
          'type': 'string',
          'pattern': '^[A-Z]{3}\$',
        },
      },
    },
    'status': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'active',
        'cancelled',
      ],
    },
    'publicationStatus': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'draft',
        'public',
        'archived',
        'removed',
      ],
    },
    'organizerCapabilities': <String, Object?>{
      'title': 'OrganizerSupplyCapabilities',
      'description': 'Audited snapshot of the attributed organizer\'s member-affordance ceiling at publication time.',
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'mode',
        'bookable',
        'paymentsEnabled',
        'waitlistEnabled',
        'hostContactEnabled',
        'claimable',
        'reviewPolicy',
      ],
      'properties': <String, Object?>{
        'mode': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'unclaimed_read_only',
            'claimed_managed',
          ],
        },
        'bookable': <String, Object?>{
          'type': 'boolean',
        },
        'paymentsEnabled': <String, Object?>{
          'type': 'boolean',
        },
        'waitlistEnabled': <String, Object?>{
          'type': 'boolean',
        },
        'hostContactEnabled': <String, Object?>{
          'type': 'boolean',
        },
        'claimable': <String, Object?>{
          'type': 'boolean',
        },
        'reviewPolicy': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'after_event_end',
            'attended_event_only',
          ],
        },
      },
      'oneOf': <Object?>[
        <String, Object?>{
          'properties': <String, Object?>{
            'mode': <String, Object?>{
              'const': 'unclaimed_read_only',
            },
            'bookable': <String, Object?>{
              'const': false,
            },
            'paymentsEnabled': <String, Object?>{
              'const': false,
            },
            'waitlistEnabled': <String, Object?>{
              'const': false,
            },
            'hostContactEnabled': <String, Object?>{
              'const': false,
            },
            'reviewPolicy': <String, Object?>{
              'const': 'after_event_end',
            },
          },
          'required': <Object?>[
            'mode',
            'bookable',
            'paymentsEnabled',
            'waitlistEnabled',
            'hostContactEnabled',
            'reviewPolicy',
          ],
        },
        <String, Object?>{
          'properties': <String, Object?>{
            'mode': <String, Object?>{
              'const': 'claimed_managed',
            },
            'bookable': <String, Object?>{
              'const': true,
            },
            'paymentsEnabled': <String, Object?>{
              'const': true,
            },
            'waitlistEnabled': <String, Object?>{
              'const': true,
            },
            'hostContactEnabled': <String, Object?>{
              'const': true,
            },
            'claimable': <String, Object?>{
              'const': false,
            },
            'reviewPolicy': <String, Object?>{
              'const': 'attended_event_only',
            },
          },
          'required': <Object?>[
            'mode',
            'bookable',
            'paymentsEnabled',
            'waitlistEnabled',
            'hostContactEnabled',
            'claimable',
            'reviewPolicy',
          ],
        },
      ],
    },
    'booking': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'mode',
        'catchBookingEnabled',
        'catchPaymentsEnabled',
        'catchReservationsEnabled',
        'catchWaitlistEnabled',
        'externalLinks',
      ],
      'properties': <String, Object?>{
        'mode': <String, Object?>{
          'type': 'string',
          'const': 'external_outbound_only',
        },
        'catchBookingEnabled': <String, Object?>{
          'type': 'boolean',
          'const': false,
        },
        'catchPaymentsEnabled': <String, Object?>{
          'type': 'boolean',
          'const': false,
        },
        'catchReservationsEnabled': <String, Object?>{
          'type': 'boolean',
          'const': false,
        },
        'catchWaitlistEnabled': <String, Object?>{
          'type': 'boolean',
          'const': false,
        },
        'externalLinks': <String, Object?>{
          'type': 'array',
          'minItems': 1,
          'maxItems': 12,
          'items': <String, Object?>{
            'type': 'object',
            'additionalProperties': false,
            'required': <Object?>[
              'platform',
              'url',
              'linkType',
              'sourceEventKey',
              'candidateId',
              'primary',
            ],
            'properties': <String, Object?>{
              'platform': <String, Object?>{
                'type': 'string',
                'enum': <Object?>[
                  'bookMyShow',
                  'district',
                  'luma',
                  'partiful',
                  'sortMyScene',
                ],
              },
              'url': <String, Object?>{
                'type': 'string',
                'format': 'uri',
                'maxLength': 2048,
              },
              'linkType': <String, Object?>{
                'type': 'string',
                'enum': <Object?>[
                  'booking_or_event_page',
                  'source_surface',
                ],
              },
              'sourceEventKey': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 240,
              },
              'candidateId': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 240,
              },
              'primary': <String, Object?>{
                'type': 'boolean',
              },
            },
          },
        },
      },
    },
    'discovery': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'citySlug',
        'countryCode',
        'availability',
        'manualApprovalRequired',
        'appVisibility',
      ],
      'properties': <String, Object?>{
        'citySlug': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': <Object?>[
                'string',
                'null',
              ],
              'minLength': 1,
              'maxLength': 80,
              'pattern': '^[a-z0-9-]+\$',
            },
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
        'countryCode': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'minLength': 2,
          'maxLength': 2,
        },
        'availability': <String, Object?>{
          'type': 'string',
          'const': 'read_only_external',
        },
        'manualApprovalRequired': <String, Object?>{
          'type': 'boolean',
          'const': true,
        },
        'appVisibility': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'hidden',
            'discoverable',
          ],
          'description': 'The attributed organizer\'s app visibility, copied at publication and kept in step when it changes, so app discovery never shows an event whose organizer is hidden in the app. The website applies the organizer\'s page and search controls itself.',
        },
      },
    },
    'dedupe': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'normalizedEventKey',
        'primaryCandidateId',
        'duplicateCandidateIds',
        'conflictPolicy',
      ],
      'properties': <String, Object?>{
        'normalizedEventKey': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 500,
        },
        'primaryCandidateId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 240,
        },
        'duplicateCandidateIds': <String, Object?>{
          'type': 'array',
          'maxItems': 24,
          'uniqueItems': true,
          'items': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 240,
          },
        },
        'conflictPolicy': <String, Object?>{
          'type': 'string',
          'const': 'single_read_only_event_with_multiple_outbound_links',
        },
      },
    },
    'externalSource': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'candidateId',
        'sourceEventKey',
        'sourceEventId',
        'platform',
        'eventUrl',
        'sourceUrl',
      ],
      'properties': <String, Object?>{
        'candidateId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 240,
        },
        'sourceEventKey': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 240,
        },
        'sourceEventId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        'platform': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'bookMyShow',
            'district',
            'luma',
            'partiful',
            'sortMyScene',
          ],
        },
        'eventUrl': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'string',
              'format': 'uri',
              'maxLength': 2048,
            },
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
        'sourceUrl': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'string',
              'format': 'uri',
              'maxLength': 2048,
            },
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
      },
    },
    'review': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'eventReviewBatchId',
        'reviewer',
        'decidedAt',
        'note',
        'importPolicyAcknowledged',
        'ownerSafeCopyReviewed',
        'blockerResolutions',
      ],
      'properties': <String, Object?>{
        'eventReviewBatchId': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'maxLength': 180,
        },
        'reviewer': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'maxLength': 180,
        },
        'decidedAt': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'pattern': '^\\d{4}-\\d{2}-\\d{2}\$',
        },
        'note': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'maxLength': 1000,
        },
        'importPolicyAcknowledged': <String, Object?>{
          'type': 'boolean',
        },
        'ownerSafeCopyReviewed': <String, Object?>{
          'type': 'boolean',
        },
        'blockerResolutions': <String, Object?>{
          'type': 'array',
          'maxItems': 6,
          'items': <String, Object?>{
            'title': 'ExternalEventBlockerResolution',
            'description': 'One explicit, event-scoped resolution or policy-backed waiver for a governed external-event import blocker.',
            'type': 'object',
            'additionalProperties': false,
            'required': <Object?>[
              'blockerCode',
              'outcome',
              'policyGapDecisionId',
              'note',
            ],
            'properties': <String, Object?>{
              'blockerCode': <String, Object?>{
                'type': 'string',
                'enum': <Object?>[
                  'missing_exact_coordinates',
                  'missing_end_time',
                  'missing_location_detail',
                  'requires_event_defaults_policy',
                  'requires_owner_safe_copy_review',
                  'duplicate_normalized_event_key',
                ],
              },
              'outcome': <String, Object?>{
                'type': 'string',
                'enum': <Object?>[
                  'resolved',
                  'waived',
                ],
              },
              'policyGapDecisionId': <String, Object?>{
                'type': <Object?>[
                  'string',
                  'null',
                ],
                'minLength': 1,
                'maxLength': 180,
              },
              'note': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 1000,
              },
            },
            'allOf': <Object?>[
              <String, Object?>{
                'if': <String, Object?>{
                  'properties': <String, Object?>{
                    'outcome': <String, Object?>{
                      'const': 'waived',
                    },
                  },
                },
                'then': <String, Object?>{
                  'properties': <String, Object?>{
                    'policyGapDecisionId': <String, Object?>{
                      'type': 'string',
                    },
                  },
                },
              },
              <String, Object?>{
                'if': <String, Object?>{
                  'properties': <String, Object?>{
                    'outcome': <String, Object?>{
                      'const': 'resolved',
                    },
                  },
                },
                'then': <String, Object?>{
                  'properties': <String, Object?>{
                    'policyGapDecisionId': <String, Object?>{
                      'type': 'null',
                    },
                  },
                },
              },
            ],
          },
        },
      },
    },
    'takedown': <String, Object?>{
      'type': <Object?>[
        'object',
        'null',
      ],
      'additionalProperties': false,
      'required': <Object?>[
        'removedAt',
        'removedByUid',
        'reason',
        'receiptId',
      ],
      'properties': <String, Object?>{
        'removedAt': <String, Object?>{
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
        'removedByUid': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        'reason': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 1000,
        },
        'receiptId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
      },
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
    },
  },
};
