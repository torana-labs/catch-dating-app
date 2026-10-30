// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/stripe_host_onboarding_link_response.schema.json.

const schemaStripeHostOnboardingLinkCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/stripe_host_onboarding_link_response.schema.json',
  'title': 'StripeHostOnboardingLinkCallableResponse',
  'description': 'Callable response returned by createStripeHostOnboardingLink.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'accountId',
    'onboardingUrl',
  ],
  'properties': <String, Object?>{
    'accountId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 120,
    },
    'onboardingUrl': <String, Object?>{
      'type': 'string',
      'format': 'uri',
      'maxLength': 2048,
    },
  },
};
