// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/admin_export_money_ledger_payload.schema.json.
// Re-exported by lib/platform/schema_contracts/generated/callable_request_dtos.g.dart.

/// Owner exports one India-time month of Catch's ledger for the accountant to import into Zoho Books: bills issued, bill payments received, nominator credit paid and costs.
final class AdminExportMoneyLedgerCallableRequest {
  const AdminExportMoneyLedgerCallableRequest({
    required this.month,
  });

  final String month;

  Map<String, Object?> toJson() => {
    'month': month,
  };
}
