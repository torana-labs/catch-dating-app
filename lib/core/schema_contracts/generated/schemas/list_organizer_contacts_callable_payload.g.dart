// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/list_organizer_contacts_payload.schema.json.

const schemaListOrganizerContactsCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/list_organizer_contacts_payload.schema.json',
  'title': 'ListOrganizerContactsCallablePayload',
  'description': 'Manager-authorized paginated organizer audience query.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'organizerId',
  ],
  'properties': <String, Object?>{
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'limit': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 100,
    },
    'cursor': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 1000,
    },
    'query': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 120,
    },
    'sort': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'lastSeen',
        'mostAttended',
        'name',
      ],
      'default': 'lastSeen',
    },
    'segmentId': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
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
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'manualTagId': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'pattern': '^[a-f0-9]{32}\$',
    },
    'segmentIds': <String, Object?>{
      'type': 'array',
      'maxItems': 12,
      'uniqueItems': true,
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
      'description': 'OR within attendance, reliability, advocacy and reachable categories; AND across selected categories.',
    },
    'manualTagIds': <String, Object?>{
      'type': 'array',
      'maxItems': 20,
      'uniqueItems': true,
      'items': <String, Object?>{
        'type': 'string',
        'pattern': '^[a-f0-9]{32}\$',
      },
      'description': 'Match any selected manual tag, combined with all selected segment categories.',
    },
  },
};
