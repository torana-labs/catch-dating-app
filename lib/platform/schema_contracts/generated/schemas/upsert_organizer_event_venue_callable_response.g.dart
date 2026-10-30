// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/upsert_organizer_event_venue_response.schema.json.

const schemaUpsertOrganizerEventVenueCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/upsert_organizer_event_venue_response.schema.json',
  'title': 'UpsertOrganizerEventVenueCallableResponse',
  'description': 'Canonical reusable venue returned after an organizer venue upsert.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'venue',
  ],
  'properties': <String, Object?>{
    'venue': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'organizerId',
        'venueId',
        'label',
        'meetingLocation',
        'status',
      ],
      'properties': <String, Object?>{
        'organizerId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        'venueId': <String, Object?>{
          'type': 'string',
          'pattern': '^[A-Za-z0-9][A-Za-z0-9_-]{0,119}\$',
        },
        'label': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 120,
        },
        'meetingLocation': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'description': 'Canonical meeting location selected from Google Places or a manually pinned map coordinate.',
          'required': <Object?>[
            'name',
            'latitude',
            'longitude',
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
              'type': 'number',
              'minimum': -90,
              'maximum': 90,
            },
            'longitude': <String, Object?>{
              'type': 'number',
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
        'defaultEventCapacity': <String, Object?>{
          'type': <Object?>[
            'integer',
            'null',
          ],
          'minimum': 1,
          'maximum': 1000,
        },
        'status': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'active',
            'archived',
          ],
        },
      },
    },
  },
};
