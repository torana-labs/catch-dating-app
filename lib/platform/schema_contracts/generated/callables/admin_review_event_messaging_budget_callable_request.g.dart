// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/admin_review_event_messaging_budget_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Exact Finance scope for a read-only event-messaging setup and current budget-decision review.
final class AdminReviewEventMessagingBudgetCallableRequest {
  const AdminReviewEventMessagingBudgetCallableRequest({
    required this.organizerId,
    required this.eventId,
    required this.routeId,
    required this.senderId,
    required this.purpose,
  });

  final String organizerId;
  final String eventId;
  final String routeId;
  final String senderId;
  final String purpose;

  Map<String, Object?> toJson() => {
    'organizerId': organizerId,
    'eventId': eventId,
    'routeId': routeId,
    'senderId': senderId,
    'purpose': purpose,
  };
}
