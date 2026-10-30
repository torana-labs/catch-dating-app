// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from embedded/activity_preferences.schema.json.

const schemaActivityPreferencesSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/embedded/activity_preferences.schema.json',
  'title': 'ActivityPreferences',
  'description': 'Per-activity user preferences. Running is the first migrated activity-specific preference object; other activity kinds can be added without new root profile fields.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'running',
  ],
  'properties': <String, Object?>{
    'running': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'paceMinSecsPerKm',
        'paceMaxSecsPerKm',
        'preferredDistances',
        'runningReasons',
        'preferredRunTimes',
        'version',
      ],
      'properties': <String, Object?>{
        'paceMinSecsPerKm': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
        },
        'paceMaxSecsPerKm': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
        },
        'preferredDistances': <String, Object?>{
          'type': 'array',
          'maxItems': 12,
          'uniqueItems': true,
          'items': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'fiveK',
              'tenK',
              'halfMarathon',
              'marathon',
            ],
          },
        },
        'runningReasons': <String, Object?>{
          'type': 'array',
          'maxItems': 12,
          'uniqueItems': true,
          'items': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'fitness',
              'community',
              'mindfulness',
              'challenge',
              'weightLoss',
              'raceTraining',
              'social',
            ],
          },
        },
        'preferredRunTimes': <String, Object?>{
          'type': 'array',
          'maxItems': 8,
          'uniqueItems': true,
          'items': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'earlyMorning',
              'morning',
              'afternoon',
              'evening',
              'night',
            ],
          },
        },
        'version': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
        },
      },
    },
  },
};
