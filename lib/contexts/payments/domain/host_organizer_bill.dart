/// Where one of Catch's bills stands, as its organizer sees it. A bill
/// still waiting to be sent is never returned to the organizer.
enum HostOrganizerBillStatus {
  sent,
  paid,
  writtenOff,
  free;

  static HostOrganizerBillStatus fromWire(String value) =>
      values.firstWhere((status) => status.name == value);
}

/// What a bill covers: a calendar month (bills made before rolling cycles) or
/// one rolling billing cycle anchored at the end of the free trial.
enum HostOrganizerBillPeriodKind {
  calendarMonth,
  cycle;

  static HostOrganizerBillPeriodKind fromWire(Object? value) =>
      value == 'cycle' ? cycle : calendarMonth;
}

/// One billing period's bill from Catch to an organizer, read through
/// `listOrganizerBills`. All amounts are in minor units.
class HostOrganizerBill {
  const HostOrganizerBill({
    required this.billId,
    required this.month,
    required this.status,
    this.periodKind = HostOrganizerBillPeriodKind.calendarMonth,
    this.periodStart,
    this.periodEnd,
    this.toolsOnly = false,
    required this.paymentCount,
    required this.eventCount,
    required this.grossMinor,
    required this.refundedMinor,
    required this.providerFeeMinor,
    required this.commissionMinor,
    required this.capMinor,
    required this.capped,
    required this.trialWaivedMinor,
    required this.gstRegistered,
    required this.gstMinor,
    required this.totalMinor,
    required this.invoiceNumber,
    required this.dueAt,
    required this.paymentUrl,
    required this.paidAt,
    required this.paidMinor,
  });

  factory HostOrganizerBill.fromJson(Map<String, Object?> json) {
    final sales = _map(json['sales']);
    final commission = _map(json['commission']);
    final gst = _map(json['gst']);
    return HostOrganizerBill(
      billId: json['billId']! as String,
      month: _monthOf(json['month']! as String),
      status: HostOrganizerBillStatus.fromWire(json['status']! as String),
      // A server from before rolling cycles sends neither; it billed months.
      periodKind: HostOrganizerBillPeriodKind.fromWire(json['periodKind']),
      periodStart: _dateOf(json['periodStartMillis']),
      periodEnd: _dateOf(json['periodEndMillis']),
      toolsOnly: json['plan'] == 'toolsOnly',
      paymentCount: sales['paymentCount']! as int,
      eventCount: sales['eventCount']! as int,
      grossMinor: sales['grossMinor']! as int,
      refundedMinor: sales['refundedMinor']! as int,
      providerFeeMinor: sales['providerFeeMinor']! as int,
      commissionMinor: commission['amountMinor']! as int,
      capMinor: commission['capMinor'] as int?,
      capped: commission['capped']! as bool,
      trialWaivedMinor: commission['trialWaivedMinor']! as int,
      gstRegistered: gst['registered']! as bool,
      gstMinor: gst['amountMinor']! as int,
      totalMinor: json['totalMinor']! as int,
      invoiceNumber: json['invoiceNumber'] as String?,
      dueAt: _dateOf(json['dueAtMillis']),
      paymentUrl: json['paymentUrl'] as String?,
      paidAt: _dateOf(json['paidAtMillis']),
      paidMinor: json['paidMinor'] as int?,
    );
  }

  final String billId;

  /// The first day of the month billed; for a cycle, of the month it ends in.
  final DateTime month;
  final HostOrganizerBillStatus status;
  final HostOrganizerBillPeriodKind periodKind;

  /// The period billed, end exclusive; null from a server before cycles.
  final DateTime? periodStart;
  final DateTime? periodEnd;

  /// The period was billed on the tools-only plan: its flat fee, no
  /// commission (never both).
  final bool toolsOnly;
  final int paymentCount;
  final int eventCount;
  final int grossMinor;
  final int refundedMinor;

  /// Razorpay's fees including their tax, taken from the organizer's account.
  final int providerFeeMinor;
  final int commissionMinor;
  final int? capMinor;
  final bool capped;
  final int trialWaivedMinor;
  final bool gstRegistered;
  final int gstMinor;
  final int totalMinor;
  final String? invoiceNumber;
  final DateTime? dueAt;
  final String? paymentUrl;
  final DateTime? paidAt;
  final int? paidMinor;

  /// Ticket sales after refunds. Commission may be charged on another base.
  int get salesMinor => grossMinor - refundedMinor;

  /// What the organizer pays Catch for the month; nothing once written off.
  int get billMinor => switch (status) {
    HostOrganizerBillStatus.sent => totalMinor,
    HostOrganizerBillStatus.paid => paidMinor ?? totalMinor,
    HostOrganizerBillStatus.writtenOff || HostOrganizerBillStatus.free => 0,
  };

  /// Ticket sales less what Razorpay took and what Catch billed.
  int get keptMinor => salesMinor - providerFeeMinor - billMinor;

  bool isOverdueAt(DateTime now) =>
      status == HostOrganizerBillStatus.sent &&
      dueAt != null &&
      dueAt!.isBefore(now);

  /// The bill can be paid from its Razorpay link.
  bool get canPay =>
      status == HostOrganizerBillStatus.sent && paymentUrl != null;

  static Map<String, Object?> _map(Object? value) =>
      Map<String, Object?>.from(value! as Map);

  static DateTime _monthOf(String month) {
    final [year, number] = month.split('-');
    return DateTime(int.parse(year), int.parse(number));
  }

  static DateTime? _dateOf(Object? millis) => millis == null
      ? null
      : DateTime.fromMillisecondsSinceEpoch(millis as int);
}
