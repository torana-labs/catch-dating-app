// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from client_writes/mark_notification_read.schema.json.

const schemaMarkNotificationReadClientWriteSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/client_writes/mark_notification_read.schema.json',
  'title': 'MarkNotificationReadClientWrite',
  'description': 'Client-owned Firestore update operation for notifications/{uid}/items/{notificationId}.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'path',
    'data',
  ],
  'properties': <String, Object?>{
    'path': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'uid',
        'notificationId',
      ],
      'properties': <String, Object?>{
        'uid': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        'notificationId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
      },
    },
    'data': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'readAt',
      ],
      'properties': <String, Object?>{
        'readAt': <String, Object?>{
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
    },
  },
  'x-firestore-operation': 'update',
  'x-firestore-path': 'notifications/{uid}/items/{notificationId}',
  'x-owner': 'notification owner direct read-state update',
};
