import 'package:catch_dating_app/contexts/programmes/domain/phone_contact.dart';

enum PhoneImportFamilySide { unassigned, partnerOne, partnerTwo, both }

enum PhoneImportEntrySource { systemContactPicker, manualHouseholdMember }

/// Local review state, deliberately without a persistence or workspace adapter.
class PhoneImportEntry {
  PhoneImportEntry({
    required this.id,
    required this.displayName,
    required List<PhoneContactNumber> numbers,
    this.selectedPhone,
    this.familySide = PhoneImportFamilySide.unassigned,
    this.household = '',
    this.source = PhoneImportEntrySource.systemContactPicker,
    this.originalName = '',
    this.reviewedInternationalPhone,
  }) : numbers = List.unmodifiable(numbers);
  final String id;
  final String displayName;
  final List<PhoneContactNumber> numbers;
  final String? selectedPhone;
  final PhoneImportFamilySide familySide;
  final String household;
  final PhoneImportEntrySource source;
  final String originalName;
  final String? reviewedInternationalPhone;
  String? get phoneForImport {
    final raw = reviewedInternationalPhone ?? selectedPhone;
    if (raw == null) return null;
    final normalized = raw.replaceAll(RegExp(r'[\s().-]'), '');
    return RegExp(r'^\+[1-9][0-9]{1,14}$').hasMatch(normalized)
        ? normalized
        : null;
  }

  bool get nameEdited =>
      source == PhoneImportEntrySource.systemContactPicker &&
      displayName != originalName;
  bool get valid =>
      displayName.trim().isNotEmpty &&
      (source == PhoneImportEntrySource.manualHouseholdMember ||
          (selectedPhone != null &&
              numbers.any((number) => number.value == selectedPhone) &&
              phoneForImport != null));

  PhoneImportEntry copyWith({
    String? displayName,
    String? selectedPhone,
    bool clearPhone = false,
    String? reviewedInternationalPhone,
    bool clearReviewedPhone = false,
    PhoneImportFamilySide? familySide,
    String? household,
    List<PhoneContactNumber>? numbers,
  }) => PhoneImportEntry(
    id: id,
    displayName: displayName ?? this.displayName,
    numbers: numbers ?? this.numbers,
    selectedPhone: clearPhone ? null : selectedPhone ?? this.selectedPhone,
    familySide: familySide ?? this.familySide,
    household: household ?? this.household,
    source: source,
    originalName: originalName,
    reviewedInternationalPhone: clearReviewedPhone
        ? null
        : reviewedInternationalPhone ?? this.reviewedInternationalPhone,
  );
}

/// A stable local snapshot for testing/review. It is not a server import DTO.
/// Canonical WorkspaceRef, member rights, assertions and server idempotency must
/// be supplied by the CRM authority before a transport can consume this review.
class PhoneImportReview {
  PhoneImportReview({
    required this.reviewId,
    required List<PhoneImportEntry> entries,
  }) : entries = List.unmodifiable(entries);
  final String reviewId;
  final List<PhoneImportEntry> entries;
}
