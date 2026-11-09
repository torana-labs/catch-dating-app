import 'package:catch_dating_app/contexts/payments/data/host_organizer_bills_repository.dart';
import 'package:catch_dating_app/contexts/payments/domain/host_organizer_bill.dart';
import 'package:catch_dating_app/contexts/payments/parts/host_organizer_bill_row.dart';
import 'package:catch_kernel/country_markets.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/errors/app_error_message.dart';
import 'package:catch_platform/l10n/catch_ui_copy.dart';
import 'package:catch_platform/riverpod_ui/catch_async_boundary.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

/// Payments spoke: Catch's bills to this organizer, newest first, as status
/// only. A period opens its statement: the sales it was on and where the bill
/// stands. Catch's charges and paying stay off the app (App Store guideline
/// 3.1.3(f)); the bill and its invoice reach the host by email.
class HostOrganizerBillsSection extends ConsumerWidget {
  const HostOrganizerBillsSection({super.key, required this.organizerId});

  final String organizerId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final provider = hostOrganizerBillsProvider(organizerId);
    return CatchAsyncBoundary<List<HostOrganizerBill>>(
      value: ref.watch(provider),
      onRetry: () => ref.invalidate(provider),
      errorContext: AppErrorContext.payments,
      initialLoadTimeout: null,
      builder: (context, bills) => HostOrganizerBillList(
        bills: bills,
        now: DateTime.now(),
        onOpenBill: (bill) => showCatchBottomSheet<void>(
          context: context,
          builder: (_) => HostOrganizerBillSheet(bill: bill),
        ),
      ),
    );
  }
}

/// The month rows; prop-driven so Widgetbook can show every state.
class HostOrganizerBillList extends StatelessWidget {
  const HostOrganizerBillList({
    super.key,
    required this.bills,
    required this.now,
    required this.onOpenBill,
  });

  final List<HostOrganizerBill> bills;
  final DateTime now;
  final ValueChanged<HostOrganizerBill> onOpenBill;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    if (bills.isEmpty) {
      return CatchSection.fieldRows(
        title: l10n.hostBillsTitle,
        children: [
          CatchField.content(
            copy: catchFieldCopy(l10n),
            title: l10n.hostBillsEmptyTitle,
            body: l10n.hostBillsEmptyBody,
          ),
        ],
      );
    }
    return CatchSection.fieldRows(
      title: l10n.hostBillsTitle,
      count: bills.length,
      children: [
        for (final bill in bills)
          CatchField.content(
            copy: catchFieldCopy(l10n),
            key: ValueKey('host-bill-${bill.billId}'),
            title: _rowTitle(l10n, bill),
            body: _rowBody(l10n, bill),
            onTap: () => onOpenBill(bill),
            actions: CatchBadge.status(
              label: _statusLabel(l10n, bill, now),
              tone: _statusTone(bill, now),
            ),
          ),
      ],
    );
  }

  String _rowTitle(AppLocalizations l10n, HostOrganizerBill bill) {
    final month = _monthLabel(l10n, bill);
    return bill.status == HostOrganizerBillStatus.free
        ? l10n.hostBillsRowTitleFree(month: month)
        : month;
  }

  String _rowBody(AppLocalizations l10n, HostOrganizerBill bill) {
    final sales = formatMinorCurrency(bill.salesMinor);
    final dueAt = bill.dueAt;
    return bill.status == HostOrganizerBillStatus.sent && dueAt != null
        ? l10n.hostBillsRowBodyDue(sales: sales, date: _dayLabel(l10n, dueAt))
        : l10n.hostBillsRowBody(sales: sales);
  }
}

/// One period's statement as status: the sales it was on and where the bill
/// stands. No Catch charge and no way to pay in the app.
class HostOrganizerBillSheet extends StatelessWidget {
  const HostOrganizerBillSheet({super.key, required this.bill});

  final HostOrganizerBill bill;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final copy = catchFieldCopy(l10n);
    final invoice = bill.invoiceNumber;
    return CatchSheet.standard(
      title: _monthLabel(l10n, bill),
      subtitle: invoice == null ? null : l10n.hostBillsInvoice(number: invoice),
      child: CatchSectionList(
        emptyStateOmitted: true,
        children: [
          CatchSection.fieldRows(
            title: l10n.hostBillsSectionBill,
            children: [
              CatchField.content(
                copy: copy,
                title: l10n.hostBillsTicketSales,
                body: _salesBody(l10n),
                valueText: formatMinorCurrency(bill.salesMinor),
              ),
              CatchField.content(
                copy: copy,
                key: const ValueKey('host-bill-status'),
                title: l10n.hostBillsStatusTitle,
                body: _statusBody(l10n),
              ),
            ],
          ),
        ],
      ),
    );
  }

  String _salesBody(AppLocalizations l10n) {
    final counts = [
      l10n.hostBillsTickets(count: bill.paymentCount),
      l10n.hostBillsEvents(count: bill.eventCount),
    ].join(' · ');
    return bill.refundedMinor > 0
        ? l10n.hostBillsSalesRefunded(
            counts: counts,
            refunded: formatMinorCurrency(bill.refundedMinor),
          )
        : counts;
  }

  String _statusBody(AppLocalizations l10n) {
    final dueAt = bill.dueAt;
    final paidAt = bill.paidAt;
    return switch (bill.status) {
      HostOrganizerBillStatus.sent when dueAt != null => l10n.hostBillsDue(
        date: _dayLabel(l10n, dueAt),
      ),
      HostOrganizerBillStatus.paid when paidAt != null => l10n.hostBillsPaidOn(
        date: _dayLabel(l10n, paidAt),
      ),
      HostOrganizerBillStatus.sent => l10n.hostBillsStatusToPay,
      HostOrganizerBillStatus.paid => l10n.hostBillsStatusPaid,
      HostOrganizerBillStatus.writtenOff => l10n.hostBillsWrittenOffBody,
      HostOrganizerBillStatus.free => l10n.hostBillsFreeBody,
    };
  }
}

String _statusLabel(
  AppLocalizations l10n,
  HostOrganizerBill bill,
  DateTime now,
) => switch (bill.status) {
  HostOrganizerBillStatus.sent when bill.isOverdueAt(now) =>
    l10n.hostBillsStatusOverdue,
  HostOrganizerBillStatus.sent => l10n.hostBillsStatusToPay,
  HostOrganizerBillStatus.paid => l10n.hostBillsStatusPaid,
  HostOrganizerBillStatus.writtenOff => l10n.hostBillsStatusWrittenOff,
  HostOrganizerBillStatus.free => l10n.hostBillsStatusFree,
};

CatchBadgeTone _statusTone(HostOrganizerBill bill, DateTime now) =>
    switch (bill.status) {
      HostOrganizerBillStatus.sent when bill.isOverdueAt(now) =>
        CatchBadgeTone.danger,
      HostOrganizerBillStatus.sent => CatchBadgeTone.warning,
      HostOrganizerBillStatus.paid => CatchBadgeTone.success,
      HostOrganizerBillStatus.writtenOff ||
      HostOrganizerBillStatus.free => CatchBadgeTone.neutral,
    };

String _monthLabel(AppLocalizations l10n, HostOrganizerBill bill) =>
    hostOrganizerBillPeriodLabel(bill, l10n.localeName);

String _dayLabel(AppLocalizations l10n, DateTime date) =>
    DateFormat.MMMd(l10n.localeName).format(date);
