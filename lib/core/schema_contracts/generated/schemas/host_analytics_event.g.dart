// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from bigquery/host_analytics_event.schema.json.

const schemaHostAnalyticsEventSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/bigquery/host_analytics_event.schema.json',
  'title': 'HostAnalyticsEvent',
  'description': 'Raw aggregate-safe BigQuery event for host-visible organizer analytics. This is the source event table for discovery metrics; Firestore must not be the source of truth for these counters.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'analytics_event_id',
    'occurred_at',
    'event_date',
    'event_name',
    'club_id',
    'page_path',
    'ingested_at',
  ],
  'properties': <String, Object?>{
    'analytics_event_id': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 160,
    },
    'occurred_at': <String, Object?>{
      'type': 'string',
      'format': 'date-time',
    },
    'event_date': <String, Object?>{
      'type': 'string',
      'pattern': '^\\d{4}-\\d{2}-\\d{2}\$',
    },
    'event_name': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'listingView',
        'searchAppearance',
        'eventView',
        'organizerSave',
        'eventSave',
        'contactClick',
        'claimClick',
        'outboundClick',
        'linkClick',
      ],
    },
    'club_id': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'target_event_id': <String, Object?>{
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
    },
    'page_path': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 240,
    },
    'source': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 80,
    },
    'session_hash': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 128,
    },
    'platform': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 40,
    },
    'link_id': <String, Object?>{
      'description': 'The owner link a linkClick opened; null for other events.',
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
    },
    'traffic_source': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'enum': <Object?>[
        'instagram',
        'whatsapp',
        'facebook',
        'google',
        'qr',
        'email',
        'direct',
        'other',
        null,
      ],
      'description': 'Where the visitor came from, mapped by the page from its referrer host or ?via= to this fixed list. Raw referrers and campaign values are never sent.',
    },
    'ingested_at': <String, Object?>{
      'type': 'string',
      'format': 'date-time',
    },
  },
};
