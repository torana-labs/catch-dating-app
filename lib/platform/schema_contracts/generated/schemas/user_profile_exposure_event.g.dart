// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from bigquery/user_profile_exposure_event.schema.json.

const schemaUserProfileExposureEventSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/bigquery/user_profile_exposure_event.schema.json',
  'title': 'UserProfileExposureEvent',
  'description': 'Raw BigQuery event for profile impression, dwell, and photo performance analytics. This table is the denominator for user-safe profile analytics and internal composition models.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'analytics_event_id',
    'occurred_at',
    'event_date',
    'subject_uid',
    'event_name',
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
    'viewer_uid': <String, Object?>{
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
    'subject_uid': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'event_id': <String, Object?>{
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
    'club_id': <String, Object?>{
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
    'event_name': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'profileImpression',
        'profileView',
        'profileDwell',
        'photoImpression',
        'photoDwell',
      ],
    },
    'surface': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 80,
    },
    'photo_id': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 180,
    },
    'photo_slot': <String, Object?>{
      'type': <Object?>[
        'integer',
        'null',
      ],
      'minimum': 0,
      'maximum': 24,
    },
    'dwell_ms': <String, Object?>{
      'type': <Object?>[
        'integer',
        'null',
      ],
      'minimum': 0,
      'maximum': 3600000,
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
    'ingested_at': <String, Object?>{
      'type': 'string',
      'format': 'date-time',
    },
  },
};
