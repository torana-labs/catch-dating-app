// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/admin_get_finance_month_payload.schema.json.
// Re-exported by lib/platform/schema_contracts/generated/callable_request_dtos.g.dart.

/// Owner reads one India-time month of Finance, line by line: ticket sales through Catch, what Catch earned, what it cost and what is not Catch's money, with the six months before for the charts.
final class AdminGetFinanceMonthCallableRequest {
  const AdminGetFinanceMonthCallableRequest({
    required this.month,
  });

  final String month;

  Map<String, Object?> toJson() => {
    'month': month,
  };
}
