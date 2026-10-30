// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/admin_set_admin_user_roles_payload.schema.json.

const schemaAdminSetAdminUserRolesCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/admin_set_admin_user_roles_payload.schema.json',
  'title': 'Admin Set Admin User Roles Callable Payload',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'targetUid',
    'roles',
    'note',
  ],
  'properties': <String, Object?>{
    'targetUid': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9_-]{3,128}\$',
    },
    'roles': <String, Object?>{
      'type': 'array',
      'uniqueItems': true,
      'items': <String, Object?>{
        'type': 'string',
        'enum': <Object?>[
          'admin',
          'adminOwner',
          'safetyReviewer',
          'support',
          'finance',
          'analyticsViewer',
          'salesStaff',
        ],
      },
    },
    'note': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 1000,
    },
  },
  'definitions': <String, Object?>{
    'adminRole': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'admin',
        'adminOwner',
        'safetyReviewer',
        'support',
        'finance',
        'analyticsViewer',
        'salesStaff',
      ],
    },
  },
};
