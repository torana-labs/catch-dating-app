import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_payment.dart';
import 'package:catch_dating_app/contexts/payments/domain/host_organizer_bill.dart';
import 'package:catch_dating_app/contexts/payments/domain/host_organizer_billing_status.dart';
import 'package:catch_dating_app/contexts/payments/parts/host_organizer_bill_row.dart';
import 'package:catch_dating_app/hosts/organizer/payments_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';
import 'package:intl/intl.dart';

/// Payments and billing in board order: the Razorpay tile, the latest Catch
/// bill's status, the plan, the bills and what to set up. Status only: the
/// app shows no Catch prices and no way to pay Catch or buy a plan (App Store
/// guideline 3.1.3(f)); bills and plans are handled on the web.
class OrganizerPaymentsBody extends StatelessWidget {
  const OrganizerPaymentsBody({
    super.key,
    required this.state,
    required this.onAction,
  });

  final OrganizerPaymentsState state;
  final ValueChanged<OrganizerPaymentsAction> onAction;

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
    final bills = state.bills;
    final ready = state.connection == HostRazorpayConnectionState.ready;
    return CatchPageBody.screen(
      variant: CatchPageBodyVariant.fixed,
      gap: CatchPageBodyGap.tight,
      children: [
        _RazorpayTile(state: state, onAction: onAction),
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
              now: state.now,
            ),
          )
        else
          _BillSpotlight(
            bill: state.currentBill,
            currencyCode: state.currencyCode,
            now: state.now,
          ),
        CatchSurface(
          key: const ValueKey<String>('payments-plan'),
          child: CatchStack(
            children: [
              CatchText(
                l10n.hostOrganizerPlanTitle,
                variant: CatchTextVariant.titleRow,
              ),
              ?_TrialStatusLine.of(state.trial),
              _PlanStatusLine(plan: state.plan),
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
                : setup.authorizationRevoked
                ? l10n.hostOrganizerRazorpayRevokedBody
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

/// Which plan the organizer is on, as neutral status. Tools-only is chosen and
/// paid on the web; the app never shows its price or a way to buy it (App
/// Store guideline 3.1.3(f)).
class _PlanStatusLine extends StatelessWidget {
  const _PlanStatusLine({required this.plan});

  final HostPlanStatus plan;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final locale = Localizations.localeOf(context).toLanguageTag();
    String day(DateTime? date) =>
        date == null ? '' : DateFormat.yMMMd(locale).format(date);
    final toolsOnly =
        plan.kind == HostPlanKind.toolsOnly &&
        plan.state == HostPlanState.active;
    final endsAt = plan.endsAt;
    final text = !toolsOnly
        ? l10n.hostOrganizerPlanTicketing
        : endsAt != null
        ? l10n.hostOrganizerPlanToolsOnlyUntil(date: day(endsAt))
        : plan.startsAt != null && plan.startsAt!.isAfter(DateTime.now())
        ? l10n.hostOrganizerPlanToolsOnlyFrom(date: day(plan.startsAt))
        : l10n.hostOrganizerPlanToolsOnly;
    return CatchText(
      text,
      key: const ValueKey<String>('payments-plan-status'),
      variant: CatchTextVariant.bodySmall,
      tone: CatchTextTone.secondary,
    );
  }
}

/// The newest Catch bill in the courts spotlight, as status only: the period,
/// whether it is due, overdue or settled, and the sales it was on. Catch's
/// charges, the cap and paying stay off the app (App Store guideline
/// 3.1.3(f)); the bill and its invoice reach the host by email.
class _BillSpotlight extends StatelessWidget {
  const _BillSpotlight({
    required this.bill,
    required this.currencyCode,
    required this.now,
  });

  final HostOrganizerBill? bill;
  final String currencyCode;
  final DateTime now;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final locale = Localizations.localeOf(context).toLanguageTag();
    final money = hostOrganizerMoney(locale, currencyCode);
    final bill = this.bill;
    final dueAt = bill?.dueAt;
    final day = DateFormat.MMMMd(locale);
    final status = switch (bill?.status) {
      null => l10n.hostOrganizerBillSpotlightNone,
      HostOrganizerBillStatus.sent
          when bill!.isOverdueAt(now) && dueAt != null =>
        l10n.hostOrganizerBillSpotlightOverdue(date: day.format(dueAt)),
      HostOrganizerBillStatus.sent when dueAt != null =>
        l10n.hostOrganizerBillSpotlightDue(date: day.format(dueAt)),
      HostOrganizerBillStatus.sent => l10n.hostOrganizerBillDue,
      HostOrganizerBillStatus.paid => l10n.hostOrganizerBillPaid,
      HostOrganizerBillStatus.writtenOff ||
      HostOrganizerBillStatus.free => l10n.hostOrganizerBillSpotlightSettled,
    };
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
            status,
            key: const ValueKey<String>('payments-bill-status'),
            variant: CatchTextVariant.displaySection,
          ),
          CatchText(
            bill == null
                ? l10n.hostOrganizerBillNoneBody
                : bill.status == HostOrganizerBillStatus.sent
                ? l10n.hostOrganizerBillEmailedBody(
                    sales: money.format(bill.salesMinor / 100),
                  )
                : l10n.hostOrganizerBillBody(
                    sales: money.format(bill.salesMinor / 100),
                  ),
            variant: CatchTextVariant.bodySmall,
          ),
        ],
      ),
    );
  }
}
