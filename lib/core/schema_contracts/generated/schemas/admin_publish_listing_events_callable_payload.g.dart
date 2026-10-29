// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/admin_publish_listing_events_payload.schema.json.

const schemaAdminPublishListingEventsCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/admin_publish_listing_events_payload.schema.json',
  'title': 'AdminPublishListingEventsCallablePayload',
  'description': 'A staff member publishes, or dry-runs, some or all of the events Supply Intake imported for one approved organizer listing as read-only, outbound-only externalEvents. Each event is planned and checked on its own; blocked events are reported, not written. Their resolutions or cited policy waivers clear governed blockers per event.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'intakeRequestId',
    'eventWorkItemIds',
    'executionMode',
    'idempotencyKey',
    'reviewNote',
    'checklist',
    'blockerResolutions',
  ],
  'properties': <String, Object?>{
    'intakeRequestId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'eventWorkItemIds': <String, Object?>{
      'type': 'array',
      'minItems': 1,
      'maxItems': 60,
      'uniqueItems': true,
      'items': <String, Object?>{
        'type': 'string',
        'minLength': 1,
        'maxLength': 180,
        'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
      },
    },
    'executionMode': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'dry_run',
        'apply',
      ],
    },
    'idempotencyKey': <String, Object?>{
      'type': 'string',
      'minLength': 8,
      'maxLength': 120,
      'pattern': '^[A-Za-z0-9:_-]+\$',
      'description': 'The reviewer\'s key; each event\'s receipt is keyed on it, so a retry replays.',
    },
    'reviewNote': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 1000,
    },
    'checklist': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'outboundLinksReviewed',
        'noCatchBookingPaymentsWaitlist',
        'ownerSafeCopyReviewed',
      ],
      'properties': <String, Object?>{
        'outboundLinksReviewed': <String, Object?>{
          'type': 'boolean',
        },
        'noCatchBookingPaymentsWaitlist': <String, Object?>{
          'type': 'boolean',
        },
        'ownerSafeCopyReviewed': <String, Object?>{
          'type': 'boolean',
        },
      },
    },
    'blockerResolutions': <String, Object?>{
      'type': 'array',
      'maxItems': 120,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'eventWorkItemId',
          'blockerCode',
          'outcome',
          'policyGapDecisionId',
          'note',
        ],
        'properties': <String, Object?>{
          'eventWorkItemId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
            'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
          },
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
      },
    },
    'eventLocations': <String, Object?>{
      'type': 'array',
      'maxItems': 60,
      'description': 'Map locations the reviewer supplied for events whose source page gave none. The coordinates clear missing_exact_coordinates; a venue name or address fills one the page left out.',
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'eventWorkItemId',
          'name',
          'address',
          'placeId',
          'latitude',
          'longitude',
        ],
        'properties': <String, Object?>{
          'eventWorkItemId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
            'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
          },
          'name': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
            'minLength': 1,
            'maxLength': 240,
          },
          'address': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
            'minLength': 1,
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
            'type': 'number',
            'minimum': -90,
            'maximum': 90,
          },
          'longitude': <String, Object?>{
            'type': 'number',
            'minimum': -180,
            'maximum': 180,
          },
        },
      },
    },
  },
  'x-callable-aliases': <Object?>[
    'adminPublishListingEvents',
  ],
};
