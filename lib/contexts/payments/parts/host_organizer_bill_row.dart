import 'package:catch_dating_app/contexts/payments/domain/host_organizer_bill.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';
import 'package:intl/intl.dart';

/// One month's Catch bill as a row: the month, what it was on, the amount
/// and where it stands. A bill that can be paid opens its payment page.
class HostOrganizerBillRow extends StatelessWidget {
  const HostOrganizerBillRow({
    super.key,
    required this.bill,
    required this.currencyCode,
    required this.now,
    this.onPay,
  });

  final HostOrganizerBill bill;
  final String currencyCode;

  /// The clock that decides whether a sent bill is overdue.
  final DateTime now;

  /// Null when the bill cannot be paid from the app.
  final VoidCallback? onPay;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final locale = Localizations.localeOf(context).toLanguageTag();
    final money = hostOrganizerMoney(locale, currencyCode);
    final overdue = bill.isOverdueAt(now);
    final (label, tone) = switch (bill.status) {
      HostOrganizerBillStatus.sent when overdue => (
        l10n.hostOrganizerBillOverdue,
        CatchBadgeTone.danger,
      ),
      HostOrganizerBillStatus.sent => (
        l10n.hostOrganizerBillDue,
        CatchBadgeTone.warning,
      ),
      HostOrganizerBillStatus.paid => (
        l10n.hostOrganizerBillPaid,
        CatchBadgeTone.success,
      ),
      HostOrganizerBillStatus.writtenOff => (
        l10n.hostOrganizerBillWrittenOff,
        CatchBadgeTone.neutral,
      ),
      HostOrganizerBillStatus.free => (
        l10n.hostOrganizerBillFree,
        CatchBadgeTone.neutral,
      ),
    };
    final onPay = bill.canPay ? this.onPay : null;
    return CatchIndexRow(
      key: ValueKey<String>('host-organizer-bill-${bill.billId}'),
      title: DateFormat.yMMMM(locale).format(bill.month),
      subtitle: bill.status == HostOrganizerBillStatus.free
          ? l10n.hostOrganizerBillTrial
          : bill.capped
          ? l10n.hostOrganizerBillCapped(
              sales: money.format(bill.salesMinor / 100),
            )
          : l10n.hostOrganizerBillSales(
              sales: money.format(bill.salesMinor / 100),
              events: bill.eventCount,
            ),
      value: money.format(bill.billMinor / 100),
      trailing: CatchBadge(label: label, tone: tone),
      density: CatchIndexRowSize.regular,
      chevron: onPay != null,
      onTap: onPay,
    );
  }
}

/// Whole-rupee money as the bills print it, such as ₹7,400.
NumberFormat hostOrganizerMoney(String locale, String currencyCode) =>
    NumberFormat.simpleCurrency(
      locale: locale,
      name: currencyCode,
      decimalDigits: 0,
    );
