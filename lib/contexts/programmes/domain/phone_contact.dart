/// Only the records explicitly returned by a system picker, held in memory.
class PhoneContact {
  PhoneContact({
    required this.localId,
    required this.displayName,
    required List<PhoneContactNumber> numbers,
  }) : numbers = List.unmodifiable(numbers);

  /// Device-local identity for deduplicating selection; never a CRM identity.
  final String localId;
  final String displayName;
  final List<PhoneContactNumber> numbers;
}

class PhoneContactNumber {
  const PhoneContactNumber({required this.value, this.label = ''});
  final String value;
  final String label;
}

/// Formatting-only comparison. This neither infers country nor verifies owner.
String phoneSelectionKey(String value) =>
    value.replaceAll(RegExp(r'[\s().-]'), '');
