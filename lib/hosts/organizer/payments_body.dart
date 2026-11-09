import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_payment.dart';
import 'package:catch_dating_app/contexts/payments/domain/host_organizer_bill.dart';
import 'package:catch_dating_app/contexts/payments/domain/host_organizer_billing_status.dart';
import 'package:catch_dating_app/contexts/payments/parts/host_organizer_bill_row.dart';
import 'package:catch_dating_app/hosts/organizer/payments_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';
import 'package:intl/intl.dart';

/// Payments and billing in board order: the Razorpay tile, this month's
/// Catch bill, the plan, the bills and what to set up.
class OrganizerPaymentsBody extends StatelessWidget {
  const OrganizerPaymentsBody({
    super.key,
    required this.state,
    required this.onAction,
    required this.onPay,
    this.footer,
  });

  final OrganizerPaymentsState state;
  final ValueChanged<OrganizerPaymentsAction> onAction;
  final ValueChanged<HostOrganizerBill> onPay;

  /// Shown under the Razorpay tile: the payout account form, for
  /// organizers whose payments run through Catch.
  final Widget? footer;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    if (!state.isOwner) {
      return CatchPageBody.screen(
        variant: CatchPageBodyVariant.fixed,
        children: [
          CatchNotice.inline(
            title: l10n.hostOrganizerPaymentsOwnerOnlyTitle,
            body: l10n.hostOrganizerPaymentsOwnerOnlyBody,
            tone: CatchNoticeTone.neutral,
            icon: CatchIcons.locked,
          ),
        ],
      );
    }
    final footer = this.footer;
    final bills = state.bills;
    final ready = state.connection == HostRazorpayConnectionState.ready;
    return CatchPageBody.screen(
      variant: CatchPageBodyVariant.fixed,
      gap: CatchPageBodyGap.tight,
      children: [
        _RazorpayTile(state: state, onAction: onAction),
        ?footer,
        if (state.billsError != null && bills == null)
          CatchNotice.inline(
            body: l10n.hostOrganizerBillsFailed,
            tone: CatchNoticeTone.warning,
            action: CatchNoticeAction(
              label: l10n.hostOrganizerRetry,
              onPressed: () => onAction(OrganizerPaymentsAction.retryBills),
            ),
          )
        else if (bills == null)
          CatchSkeleton.content(
            child: _BillSpotlight(
              bill: null,
              currencyCode: state.currencyCode,
              onPay: null,
            ),
          )
        else
          _BillSpotlight(
            bill: state.currentBill,
            currencyCode: state.currencyCode,
            onPay: onPay,
          ),
        CatchSurface(
          child: CatchStack(
            children: [
              CatchStack(
                direction: CatchStackDirection.row,
                justify: CatchStackJustify.between,
                align: CatchStackAlign.center,
                children: [
                  Flexible(
                    child: CatchText(
                      l10n.hostOrganizerPlanTitle,
                      variant: CatchTextVariant.titleRow,
                    ),
                  ),
                  CatchButton(
                    key: const ValueKey<String>('payments-compare-plans'),
                    label: l10n.hostOrganizerPlanCompare,
                    variant: CatchButtonVariant.quiet,
                    size: CatchButtonSize.sm,
                    trailing: CatchIcon(CatchIcons.openExternal),
                    onPressed: () =>
                        onAction(OrganizerPaymentsAction.comparePlans),
                  ),
                ],
              ),
              ?_TrialStatusLine.of(state.trial),
              CatchText(
                l10n.hostOrganizerPlanBody,
                variant: CatchTextVariant.bodySmall,
                tone: CatchTextTone.secondary,
              ),
            ],
          ),
        ),
        CatchSection(
          title: l10n.hostOrganizerBillsTitle,
          empty: bills == null ? null : l10n.hostOrganizerBillsEmpty,
          children: [
            for (final bill in bills ?? const <HostOrganizerBill>[])
              HostOrganizerBillRow(
                bill: bill,
                currencyCode: state.currencyCode,
                now: state.now,
                onPay: () => onPay(bill),
              ),
          ],
        ),
        CatchSection(
          title: l10n.hostOrganizerSetUpTitle,
          children: [
            CatchIndexRow(
              key: const ValueKey<String>('payments-row-razorpay'),
              title: l10n.hostOrganizerSetUpRazorpay,
              subtitle: ready
                  ? state.readyConnection?.accountId
                  : l10n.hostOrganizerSetUpRazorpayNote,
              value: ready
                  ? l10n.hostOrganizerRazorpayConnected
                  : l10n.hostOrganizerRazorpayNotConnected,
              density: CatchIndexRowSize.regular,
              chevron: true,
              onTap: state.connectionPending || state.setup?.available != true
                  ? null
                  : () => onAction(switch (state.connection) {
                      HostRazorpayConnectionState.ready =>
                        OrganizerPaymentsAction.disconnect,
                      HostRazorpayConnectionState.notConnected ||
                      null => OrganizerPaymentsAction.connect,
                      _ => OrganizerPaymentsAction.reconnect,
                    }),
            ),
            CatchIndexRow(
              key: const ValueKey<String>('payments-row-refunds'),
              title: l10n.hostOrganizerSetUpRefunds,
              subtitle: l10n.hostOrganizerSetUpRefundsNote,
              density: CatchIndexRowSize.regular,
              chevron: true,
              onTap: () => onAction(OrganizerPaymentsAction.refunds),
            ),
          ],
        ),
      ],
    );
  }
}

/// The Razorpay connection: whether guests can pay the organizer, and the
/// one command that moves it on.
class _RazorpayTile extends StatelessWidget {
  const _RazorpayTile({required this.state, required this.onAction});

  final OrganizerPaymentsState state;
  final ValueChanged<OrganizerPaymentsAction> onAction;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final setup = state.setup;
    final connection = state.connection;
    final error = state.connectionError;
    if (setup == null) {
      return error == null
          ? CatchSkeleton.content(
              child: CatchSurface(
                child: CatchText(
                  l10n.hostOrganizerRazorpayTitle,
                  variant: CatchTextVariant.titleRow,
                ),
              ),
            )
          : CatchNotice.inline(
              body: l10n.hostOrganizerRazorpayFailed,
              tone: CatchNoticeTone.warning,
              action: CatchNoticeAction(
                label: l10n.hostOrganizerRetry,
                onPressed: () =>
                    onAction(OrganizerPaymentsAction.retryConnection),
              ),
            );
    }
    final (label, tone) = switch (connection) {
      HostRazorpayConnectionState.ready => (
        l10n.hostOrganizerRazorpayConnected,
        CatchBadgeTone.success,
      ),
      HostRazorpayConnectionState.connecting => (
        l10n.hostOrganizerRazorpayConnecting,
        CatchBadgeTone.warning,
      ),
      HostRazorpayConnectionState.needsReconnect => (
        l10n.hostOrganizerRazorpayNeedsReconnect,
        CatchBadgeTone.warning,
      ),
      HostRazorpayConnectionState.notConnected ||
      null => (l10n.hostOrganizerRazorpayNotConnected, CatchBadgeTone.neutral),
    };
    final pending = state.connectionPending;
    final CatchButton? button = !setup.available
        ? null
        : switch (connection) {
            HostRazorpayConnectionState.ready => CatchButton(
              key: const ValueKey<String>('payments-razorpay-refresh'),
              label: l10n.hostOrganizerRazorpayRefresh,
              variant: CatchButtonVariant.quiet,
              size: CatchButtonSize.sm,
              status: pending
                  ? CatchButtonStatus.loading
                  : CatchButtonStatus.idle,
              onPressed: pending
                  ? null
                  : () => onAction(OrganizerPaymentsAction.refresh),
            ),
            HostRazorpayConnectionState.notConnected || null => CatchButton(
              key: const ValueKey<String>('payments-razorpay-connect'),
              label: l10n.hostOrganizerRazorpayConnect,
              size: CatchButtonSize.sm,
              trailing: CatchIcon(CatchIcons.openExternal),
              status: pending
                  ? CatchButtonStatus.loading
                  : CatchButtonStatus.idle,
              onPressed: pending
                  ? null
                  : () => onAction(OrganizerPaymentsAction.connect),
            ),
            _ => CatchButton(
              key: const ValueKey<String>('payments-razorpay-reconnect'),
              label: l10n.hostOrganizerRazorpayReconnect,
              size: CatchButtonSize.sm,
              trailing: CatchIcon(CatchIcons.openExternal),
              status: pending
                  ? CatchButtonStatus.loading
                  : CatchButtonStatus.idle,
              onPressed: pending
                  ? null
                  : () => onAction(OrganizerPaymentsAction.reconnect),
            ),
          };
    return CatchSurface(
      child: CatchStack(
        children: [
          CatchStack(
            direction: CatchStackDirection.row,
            justify: CatchStackJustify.between,
            align: CatchStackAlign.center,
            children: [
              Flexible(
                child: CatchText(
                  l10n.hostOrganizerRazorpayTitle,
                  variant: CatchTextVariant.titleRow,
                ),
              ),
              CatchBadge(label: label, tone: tone, dot: true),
            ],
          ),
          CatchText(
            !setup.available
                ? l10n.hostOrganizerRazorpayUnavailable
                : connection == HostRazorpayConnectionState.ready
                ? l10n.hostOrganizerRazorpayReadyBody
                : l10n.hostOrganizerRazorpayConnectBody,
            variant: CatchTextVariant.bodySmall,
          ),
          if (button != null)
            CatchStack(direction: CatchStackDirection.row, children: [button]),
          if (error != null)
            CatchNotice.inline(
              body: l10n.hostOrganizerRazorpayFailed,
              tone: CatchNoticeTone.warning,
            ),
        ],
      ),
    );
  }
}

/// Where the free trial stands, as neutral status text: days left, the day
/// it starts or the day it ended. It never shows a price or a purchase prompt
/// (App Store guideline 3.1.3(f)); nothing is gated when the trial ends.
class _TrialStatusLine extends StatelessWidget {
  const _TrialStatusLine(this.trial);

  /// Null when there is nothing to say: no trial, unknown terms or no status.
  static _TrialStatusLine? of(HostTrialStatus? trial) => switch (trial?.state) {
    HostTrialState.notStarted ||
    HostTrialState.scheduled ||
    HostTrialState.active ||
    HostTrialState.ended => _TrialStatusLine(trial!),
    _ => null,
  };

  final HostTrialStatus trial;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final locale = Localizations.localeOf(context).toLanguageTag();
    String day(DateTime? date) =>
        date == null ? '' : DateFormat.yMMMd(locale).format(date);
    final daysLeft = trial.daysLeft;
    final (title, body) = switch (trial.state) {
      HostTrialState.active when daysLeft != null => (
        l10n.hostOrganizerTrialActive(days: daysLeft),
        l10n.hostOrganizerTrialActiveBody(date: day(trial.endsAt)),
      ),
      HostTrialState.scheduled => (
        l10n.hostOrganizerTrialScheduled(date: day(trial.startsAt)),
        null,
      ),
      HostTrialState.ended => (
        l10n.hostOrganizerTrialEnded(date: day(trial.endsAt)),
        null,
      ),
      _ => (l10n.hostOrganizerTrialNotStarted, null),
    };
    return CatchStack(
      key: const ValueKey<String>('payments-trial-status'),
      gap: CatchStackGap.none,
      children: [
        CatchText(title),
        if (body != null)
          CatchText(
            body,
            variant: CatchTextVariant.bodySmall,
            tone: CatchTextTone.secondary,
          ),
      ],
    );
  }
}

/// The newest Catch bill in the courts spotlight: its amount, what it was
/// on, how close it came to the cap, and Pay when it is due.
class _BillSpotlight extends StatelessWidget {
  const _BillSpotlight({
    required this.bill,
    required this.currencyCode,
    required this.onPay,
  });

  final HostOrganizerBill? bill;
  final String currencyCode;
  final ValueChanged<HostOrganizerBill>? onPay;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final locale = Localizations.localeOf(context).toLanguageTag();
    final money = hostOrganizerMoney(locale, currencyCode);
    final bill = this.bill;
    final onPay = this.onPay;
    final cap = bill?.capMinor;
    final dueAt = bill?.dueAt;
    return CatchSurface(
      block: CatchSurfaceBlock.spotlight,
      color: CatchSurfaceColor.courts,
      child: CatchStack(
        children: [
          CatchText(
            bill == null
                ? l10n.hostOrganizerBillKickerNone
                : l10n.hostOrganizerBillKicker(
                    month: hostOrganizerBillPeriodLabel(bill, locale),
                  ),
            variant: CatchTextVariant.labelKicker,
          ),
          CatchText(
            money.format((bill?.billMinor ?? 0) / 100),
            variant: CatchTextVariant.displayTitle,
            numeric: true,
          ),
          CatchText(
            bill == null
                ? l10n.hostOrganizerBillNoneBody
                : dueAt != null && bill.status == HostOrganizerBillStatus.sent
                ? l10n.hostOrganizerBillBodyDue(
                    sales: money.format(bill.salesMinor / 100),
                    date: DateFormat.MMMMd(locale).format(dueAt),
                  )
                : l10n.hostOrganizerBillBody(
                    sales: money.format(bill.salesMinor / 100),
                  ),
            variant: CatchTextVariant.bodySmall,
          ),
          if (bill != null && cap != null && cap > 0) ...[
            CatchMeter(
              value: bill.commissionMinor.toDouble(),
              max: cap * 1.2,
              limit: cap.toDouble(),
              variant: CatchMeterVariant.cap,
              size: CatchMeterSize.lg,
              label: l10n.hostOrganizerBillMeter,
            ),
            CatchText(
              bill.capped || bill.commissionMinor >= cap
                  ? l10n.hostOrganizerBillCapReached(
                      cap: money.format(cap / 100),
                    )
                  : l10n.hostOrganizerBillCapLeft(
                      remaining: money.format(
                        (cap - bill.commissionMinor) / 100,
                      ),
                      cap: money.format(cap / 100),
                    ),
              variant: CatchTextVariant.labelKicker,
            ),
          ],
          if (bill != null && bill.canPay && onPay != null)
            CatchStack(
              direction: CatchStackDirection.row,
              children: [
                CatchButton(
                  key: const ValueKey<String>('payments-pay-bill'),
                  label: l10n.hostOrganizerBillPay,
                  size: CatchButtonSize.sm,
                  variant: CatchButtonVariant.light,
                  trailing: CatchIcon(CatchIcons.openExternal),
                  onPressed: () => onPay(bill),
                ),
              ],
            ),
        ],
      ),
    );
  }
}
