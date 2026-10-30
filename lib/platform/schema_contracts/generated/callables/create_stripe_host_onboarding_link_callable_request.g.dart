// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/create_stripe_host_onboarding_link_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Callable payload accepted by createStripeHostOnboardingLink. Hosts can optionally provide the Stripe account country and default currency for first-time setup.
final class CreateStripeHostOnboardingLinkCallableRequest {
  const CreateStripeHostOnboardingLinkCallableRequest({
    this.country,
    this.defaultCurrency,
  });

  final String? country;
  final String? defaultCurrency;

  Map<String, Object?> toJson() => {
    'country': ?country,
    'defaultCurrency': ?defaultCurrency,
  };
}
