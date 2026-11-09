import 'package:catch_dating_app/contexts/payments/domain/host_organizer_bill.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';
import 'package:intl/intl.dart';

/// One Catch bill as a row: the period, what it was on and where it stands.
/// Status only: no Catch charge and no way to pay in the app (App Store
/// guideline 3.1.3(f)); the bill reaches the host by email.
class HostOrganizerBillRow extends StatelessWidget {
  const HostOrganizerBillRow({
    super.key,
    required this.bill,
    required this.currencyCode,
    required this.now,
  });

  final HostOrganizerBill bill;
  final String currencyCode;

  /// The clock that decides whether a sent bill is overdue.
  final DateTime now;

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
    return CatchIndexRow(
      key: ValueKey<String>('host-organizer-bill-${bill.billId}'),
      title: hostOrganizerBillPeriodLabel(bill, locale),
      subtitle: bill.status == HostOrganizerBillStatus.free
          ? l10n.hostOrganizerBillTrial
          : bill.toolsOnly
          ? l10n.hostOrganizerBillToolsOnly
          : bill.capped
          ? l10n.hostOrganizerBillCapped(
              sales: money.format(bill.salesMinor / 100),
            )
          : l10n.hostOrganizerBillSales(
              sales: money.format(bill.salesMinor / 100),
              events: bill.eventCount,
            ),
      trailing: CatchBadge(label: label, tone: tone),
      density: CatchIndexRowSize.regular,
      onTap: null,
    );
  }
}

/// A bill's period as people say it: "October 2026" for a calendar month, or
/// "Nov 9 – Dec 8 2026" for a rolling cycle (its last day, not its exclusive
/// end).
String hostOrganizerBillPeriodLabel(HostOrganizerBill bill, String locale) {
  final start = bill.periodStart;
  final end = bill.periodEnd;
  if (bill.periodKind != HostOrganizerBillPeriodKind.cycle ||
      start == null ||
      end == null) {
    return DateFormat.yMMMM(locale).format(bill.month);
  }
  final last = end.subtract(const Duration(milliseconds: 1));
  final day = DateFormat.MMMd(locale);
  return '${day.format(start)} – ${day.format(last)} '
      '${DateFormat.y(locale).format(last)}';
}

/// Whole-rupee money as the bills print it, such as ₹7,400.
NumberFormat hostOrganizerMoney(String locale, String currencyCode) =>
    NumberFormat.simpleCurrency(
      locale: locale,
      name: currencyCode,
      decimalDigits: 0,
    );
