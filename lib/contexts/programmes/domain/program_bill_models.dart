import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';

/// How a bill line compares with the recorded trips.
enum ProgramBillCheck {
  matches,
  amountDiffers,
  noRate,
  noTrip,
  voided,
  duplicate,
}

/// Where a vendor bill stands.
enum ProgramBillStatus { open, questioned, approved }

/// What `reconcileProgramVendorBill` does.
enum ProgramBillAction { review, check, question, approve }

/// One line as the vendor billed it, before the check.
class ProgramBillLineInput {
  const ProgramBillLineInput({
    required this.reference,
    required this.billedMinor,
    this.tripId,
  });

  final String reference;
  final int billedMinor;
  final String? tripId;

  Map<String, Object?> toJson() => {
    'reference': reference,
    'billedMinor': billedMinor,
    'tripId': ?tripId,
  };

  /// Reads pasted bill lines, one per line: the reference on the bill, then
  /// a comma or tab and the amount in rupees (`T-041, 2,000`).
  /// Lines that do not parse are skipped.
  static List<ProgramBillLineInput> parse(String text) => [
    for (final raw in text.split('\n')) ?_parseLine(raw),
  ];

  static final _line = RegExp(
    r'^(.*?)[,\t]\s*(?:₹|Rs\.?)?\s*([0-9][0-9,]*(?:\.[0-9]+)?)\s*$',
  );

  static ProgramBillLineInput? _parseLine(String raw) {
    final match = _line.firstMatch(raw.trim());
    if (match == null) return null;
    final reference = match.group(1)!.trim();
    final amount = double.tryParse(match.group(2)!.replaceAll(',', ''));
    if (reference.isEmpty || amount == null) return null;
    return ProgramBillLineInput(
      reference: reference.length > 120
          ? reference.substring(0, 120)
          : reference,
      billedMinor: (amount * 100).round(),
    );
  }
}

/// One checked bill line.
class ProgramBillLine {
  const ProgramBillLine({
    required this.lineId,
    required this.reference,
    required this.tripId,
    required this.billedMinor,
    required this.recordedMinor,
    required this.check,
  });

  factory ProgramBillLine.fromMap(Map<Object?, Object?> map) => ProgramBillLine(
    lineId: requiredString(map, 'lineId'),
    reference: requiredString(map, 'reference'),
    tripId: map['tripId'] as String?,
    billedMinor: requiredInt(map, 'billedMinor'),
    recordedMinor: (map['recordedMinor'] as num?)?.toInt(),
    check: nullableEnum(map['check'], ProgramBillCheck.values)!,
  );

  final String lineId;
  final String reference;
  final String? tripId;
  final int billedMinor;
  final int? recordedMinor;
  final ProgramBillCheck check;

  bool get toQuestion => check != ProgramBillCheck.matches;
}

/// A stored, re-checked vendor bill.
class ProgramVendorBill {
  const ProgramVendorBill({
    required this.invoiceNumber,
    required this.receivedAt,
    required this.status,
    required this.note,
    required this.lines,
    required this.billedMinor,
    required this.recordedMinor,
    required this.questionMinor,
    required this.recordedTrips,
    required this.approvedMinor,
    required this.revision,
  });

  factory ProgramVendorBill.fromMap(Map<Object?, Object?> map) {
    final totals = requiredMap(map['totals'], 'bill totals');
    return ProgramVendorBill(
      invoiceNumber: map['invoiceNumber'] as String?,
      receivedAt: nullableDateTime(map['receivedAtMillis']),
      status: nullableEnum(map['status'], ProgramBillStatus.values)!,
      note: map['note'] as String?,
      lines: mapList(
        map['lines'],
        'lines',
      ).map(ProgramBillLine.fromMap).toList(growable: false),
      billedMinor: requiredInt(totals, 'billedMinor'),
      recordedMinor: requiredInt(totals, 'recordedMinor'),
      questionMinor: requiredInt(totals, 'questionMinor'),
      recordedTrips: requiredInt(totals, 'recordedTrips'),
      approvedMinor: (map['approvedMinor'] as num?)?.toInt(),
      revision: requiredInt(map, 'revision'),
    );
  }

  final String? invoiceNumber;
  final DateTime? receivedAt;
  final ProgramBillStatus status;
  final String? note;
  final List<ProgramBillLine> lines;
  final int billedMinor;
  final int recordedMinor;
  final int questionMinor;
  final int recordedTrips;
  final int? approvedMinor;
  final int revision;

  List<ProgramBillLine> get toQuestion =>
      lines.where((line) => line.toQuestion).toList(growable: false);
}

/// A recorded trip the bill does not cover.
class ProgramUnbilledTrip {
  const ProgramUnbilledTrip({
    required this.tripId,
    required this.departedAt,
    required this.destinationLabel,
    required this.recordedMinor,
  });

  factory ProgramUnbilledTrip.fromMap(Map<Object?, Object?> map) =>
      ProgramUnbilledTrip(
        tripId: requiredString(map, 'tripId'),
        departedAt: nullableDateTime(map['departedAtMillis']),
        destinationLabel: map['destinationLabel'] as String?,
        recordedMinor: (map['recordedMinor'] as num?)?.toInt(),
      );

  final String tripId;
  final DateTime? departedAt;
  final String? destinationLabel;
  final int? recordedMinor;
}

/// `reconcileProgramVendorBill`: the vendor's bill against its trips.
class ProgramVendorBillView {
  const ProgramVendorBillView({
    required this.programId,
    required this.vendorId,
    required this.vendorName,
    required this.currency,
    required this.bill,
    required this.recordedTrips,
    required this.recordedMinor,
    required this.unbilled,
  });

  factory ProgramVendorBillView.fromCallableData(Object? value) {
    final map = requiredMap(value, 'vendor bill');
    final bill = map['bill'];
    return ProgramVendorBillView(
      programId: requiredString(map, 'programId'),
      vendorId: requiredString(map, 'vendorId'),
      vendorName: requiredString(map, 'vendorName'),
      currency: requiredString(map, 'currency'),
      bill: bill == null
          ? null
          : ProgramVendorBill.fromMap(requiredMap(bill, 'bill')),
      recordedTrips: requiredInt(map, 'recordedTrips'),
      recordedMinor: requiredInt(map, 'recordedMinor'),
      unbilled: mapList(
        map['unbilled'],
        'unbilled',
      ).map(ProgramUnbilledTrip.fromMap).toList(growable: false),
    );
  }

  final String programId;
  final String vendorId;
  final String vendorName;
  final String currency;
  final ProgramVendorBill? bill;
  final int recordedTrips;
  final int recordedMinor;
  final List<ProgramUnbilledTrip> unbilled;
}
