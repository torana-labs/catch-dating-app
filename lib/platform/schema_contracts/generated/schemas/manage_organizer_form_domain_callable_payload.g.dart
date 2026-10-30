// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/manage_organizer_form_domain_payload.schema.json.

const schemaManageOrganizerFormDomainCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/manage_organizer_form_domain_payload.schema.json',
  'title': 'ManageOrganizerFormDomainCallablePayload',
  'description': 'Manager-only reservation, DNS verification, or revocation request. Hosting and certificate state cannot be supplied by clients.',
  'oneOf': <Object?>[
    <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'action',
        'hostname',
        'organizerId',
        'formId',
      ],
      'properties': <String, Object?>{
        'action': <String, Object?>{
          'const': 'reserve',
        },
        'hostname': <String, Object?>{
          'type': 'string',
          'minLength': 4,
          'maxLength': 253,
          'pattern': '^[a-z0-9.-]+\$',
        },
        'organizerId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        'formId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
      },
    },
    <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'action',
        'hostname',
        'organizerId',
      ],
      'properties': <String, Object?>{
        'action': <String, Object?>{
          'const': 'verify',
        },
        'hostname': <String, Object?>{
          'type': 'string',
          'minLength': 4,
          'maxLength': 253,
          'pattern': '^[a-z0-9.-]+\$',
        },
        'organizerId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
      },
    },
    <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'action',
        'hostname',
        'organizerId',
      ],
      'properties': <String, Object?>{
        'action': <String, Object?>{
          'const': 'revoke',
        },
        'hostname': <String, Object?>{
          'type': 'string',
          'minLength': 4,
          'maxLength': 253,
          'pattern': '^[a-z0-9.-]+\$',
        },
        'organizerId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
      },
    },
  ],
};
