// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/admin_set_admin_user_roles_response.schema.json.

const schemaAdminSetAdminUserRolesCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/admin_set_admin_user_roles_response.schema.json',
  'title': 'Admin Set Admin User Roles Callable Response',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'user',
    'beforeRoles',
    'afterRoles',
  ],
  'properties': <String, Object?>{
    'user': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'targetUid',
        'email',
        'displayName',
        'disabled',
        'roles',
        'assignmentPath',
      ],
      'properties': <String, Object?>{
        'targetUid': <String, Object?>{
          'type': 'string',
          'pattern': '^[A-Za-z0-9_-]{3,128}\$',
        },
        'email': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'string',
            },
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
        'displayName': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'string',
            },
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
        'disabled': <String, Object?>{
          'type': 'boolean',
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
        'assignmentPath': <String, Object?>{
          'type': 'string',
          'pattern': '^adminRoleAssignments/[^/]+\$',
        },
      },
    },
    'beforeRoles': <String, Object?>{
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
    'afterRoles': <String, Object?>{
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
    'nullableText': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'user': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'targetUid',
        'email',
        'displayName',
        'disabled',
        'roles',
        'assignmentPath',
      ],
      'properties': <String, Object?>{
        'targetUid': <String, Object?>{
          'type': 'string',
          'pattern': '^[A-Za-z0-9_-]{3,128}\$',
        },
        'email': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'string',
            },
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
        'displayName': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'string',
            },
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
        'disabled': <String, Object?>{
          'type': 'boolean',
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
        'assignmentPath': <String, Object?>{
          'type': 'string',
          'pattern': '^adminRoleAssignments/[^/]+\$',
        },
      },
    },
  },
};
