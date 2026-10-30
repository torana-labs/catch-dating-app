// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/upsert_program_household_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Create or update a household invitation grouping for program guests.
final class UpsertProgramHouseholdCallableRequest {
  const UpsertProgramHouseholdCallableRequest({
    required this.programId,
    this.householdId,
    this.expectedRevision,
    required this.label,
    required this.primaryContactName,
    this.primaryPhoneE164,
    this.primaryEmail,
    required this.memberGuestIds,
    this.deliveryPreference,
    this.fieldChoices,
  });

  final String programId;
  final String? householdId;
  final int? expectedRevision;
  final String label;
  final String primaryContactName;
  final String? primaryPhoneE164;
  final String? primaryEmail;
  final List<String> memberGuestIds;
  final String? deliveryPreference;
  final Map<String, Object?>? fieldChoices;

  Map<String, Object?> toJson() => {
    'programId': programId,
    'householdId': ?householdId,
    'expectedRevision': ?expectedRevision,
    'label': label,
    'primaryContactName': primaryContactName,
    'primaryPhoneE164': ?primaryPhoneE164,
    'primaryEmail': ?primaryEmail,
    'memberGuestIds': memberGuestIds,
    'deliveryPreference': ?deliveryPreference,
    'fieldChoices': ?fieldChoices,
  };
}
