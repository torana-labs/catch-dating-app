// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/create_stripe_host_onboarding_link_payload.schema.json.

const schemaCreateStripeHostOnboardingLinkCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/create_stripe_host_onboarding_link_payload.schema.json',
  'title': 'CreateStripeHostOnboardingLinkCallablePayload',
  'description': 'Callable payload accepted by createStripeHostOnboardingLink. Hosts can optionally provide the Stripe account country and default currency for first-time setup.',
  'type': 'object',
  'additionalProperties': false,
  'properties': <String, Object?>{
    'country': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 2,
      'maxLength': 2,
    },
    'defaultCurrency': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 3,
      'maxLength': 3,
    },
  },
};
