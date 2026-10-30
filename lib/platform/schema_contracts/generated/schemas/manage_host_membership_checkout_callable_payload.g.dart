// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/manage_host_membership_checkout_payload.schema.json.

const schemaManageHostMembershipCheckoutCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/manage_host_membership_checkout_payload.schema.json',
  'title': 'ManageHostMembershipCheckoutCallablePayload',
  'description': 'Member checkout: prepare creates a provider subscription and returns its hosted mandate-authorization link; refresh pulls the provider state and applies it.',
  'x-owner': 'Consumer membership join flow',
  'oneOf': <Object?>[
    <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'action',
        'organizerId',
        'planId',
        'interval',
      ],
      'properties': <String, Object?>{
        'action': <String, Object?>{
          'const': 'prepare',
        },
        'organizerId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        'planId': <String, Object?>{
          'type': 'string',
          'pattern': '^hmp_[A-Za-z0-9]{20}\$',
        },
        'interval': <String, Object?>{
          'enum': <Object?>[
            'monthly',
            'annual',
          ],
        },
      },
    },
    <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'action',
        'checkoutId',
      ],
      'properties': <String, Object?>{
        'action': <String, Object?>{
          'const': 'refresh',
        },
        'checkoutId': <String, Object?>{
          'type': 'string',
          'pattern': '^hmc_[A-Za-z0-9]{20}\$',
        },
      },
    },
  ],
};
