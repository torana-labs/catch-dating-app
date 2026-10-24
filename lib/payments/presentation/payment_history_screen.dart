import 'package:catch_dating_app/auth/data/auth_repository.dart';
import 'package:catch_dating_app/core/app_error_message.dart';
import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_async_boundary.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_localized_error_state.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_dating_app/core/time_formatters.dart';
import 'package:catch_dating_app/events/data/event_repository.dart';
import 'package:catch_dating_app/events/domain/event_formatters.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/payments/data/payment_history_repository.dart';
import 'package:catch_dating_app/payments/domain/payment.dart';
import 'package:catch_dating_app/payments/presentation/payment_history_keys.dart';
import 'package:catch_dating_app/payments/presentation/payment_history_state.dart';
import 'package:catch_dating_app/payments/presentation/payment_history_view_model.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class PaymentHistoryScreen extends ConsumerWidget {
  const PaymentHistoryScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final uidAsync = ref.watch(uidProvider);

    return CatchRouteScaffold(
      topBarBuilder: (context, scrolledUnder) => CatchTopBar.route(
        title: context.l10n.paymentsPaymentHistoryScreenTitlePaymentHistory,
        navigation: const CatchTopBarNavigation(
          mode: CatchTopBarNavigationMode.back,
        ),
        emphasis: scrolledUnder
            ? CatchTopBarEmphasis.divided
            : CatchTopBarEmphasis.plain,
      ),
      body: CatchRouteBody.standardConstrained(
        child: CatchAsyncBoundary<String?>(
          value: uidAsync,
          loadingBuilder: (_) => const PaymentHistorySkeleton(),
          errorContext: AppErrorContext.payments,
          onRetry: () => ref.invalidate(uidProvider),
          builder: (context, uid) {
            if (uid == null) {
              return Center(
                child: CatchEmptyState(
                  icon: CatchIcons.lockOutlineRounded,
                  title: context
                      .l10n
                      .paymentsPaymentHistoryScreenTitleSignInRequired,
                  message: context
                      .l10n
                      .paymentsPaymentHistoryScreenMessageSignInAgainTo,
                ),
              );
            }
            return PaymentHistoryBody(userId: uid);
          },
        ),
      ),
    );
  }
}

class PaymentHistoryBody extends ConsumerWidget {
  const PaymentHistoryBody({super.key, required this.userId});

  final String userId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final paymentHistoryAsync = ref.watch(
      paymentHistoryViewModelProvider(userId),
    );

    return CatchAsyncBoundary<PaymentHistoryViewModel>(
      value: paymentHistoryAsync,
      loadingBuilder: (_) => const PaymentHistorySkeleton(),
      errorContext: AppErrorContext.payments,
      onRetry: () => ref.invalidate(watchPaymentsForUserProvider(userId)),
      builder: (context, paymentHistory) => PaymentHistoryList(
        paymentHistory: paymentHistory,
        onRetryEventTitles: () {
          final eventIds = {
            for (final row in paymentHistory.rows) row.payment.eventId,
          };
          if (eventIds.isNotEmpty) {
            ref.invalidate(watchEventsByIdsProvider(EventsByIdQuery(eventIds)));
          }
        },
      ),
    );
  }
}

class PaymentHistoryList extends StatelessWidget {
  const PaymentHistoryList({
    super.key,
    required this.paymentHistory,
    this.onRetryEventTitles,
  });

  final PaymentHistoryViewModel paymentHistory;
  final VoidCallback? onRetryEventTitles;

  @override
  Widget build(BuildContext context) {
    if (paymentHistory.isEmpty) {
      return Center(
        child: CatchEmptyState(
          icon: CatchIcons.receiptLongOutlined,
          title: context.l10n.paymentsPaymentHistoryScreenTitleNoPaymentsYet,
          message: context
              .l10n
              .paymentsPaymentHistoryScreenMessageEventBookingsAndRefunds,
        ),
      );
    }

    switch (paymentHistory.eventTitleStatus) {
      case PaymentEventTitleStatus.loading:
        return const PaymentHistorySkeleton();
      case PaymentEventTitleStatus.error:
        return CatchLocalizedErrorState(
          paymentHistory.eventTitleError!,
          context: AppErrorContext.event,
          onRetry: onRetryEventTitles,
        );
      case PaymentEventTitleStatus.ready:
        break;
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (var index = 0; index < paymentHistory.rows.length; index++) ...[
          PaymentHistoryTile(row: paymentHistory.rows[index]),
          if (index < paymentHistory.rows.length - 1)
            const CatchDivider.fieldRow(indent: 0),
        ],
      ],
    );
  }
}

class PaymentHistorySkeleton extends StatelessWidget {
  const PaymentHistorySkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return const Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        PaymentHistoryTileSkeleton(),
        CatchDivider.fieldRow(indent: 0),
        PaymentHistoryTileSkeleton(),
        CatchDivider.fieldRow(indent: 0),
        PaymentHistoryTileSkeleton(),
        CatchDivider.fieldRow(indent: 0),
        PaymentHistoryTileSkeleton(),
        CatchDivider.fieldRow(indent: 0),
        PaymentHistoryTileSkeleton(),
      ],
    );
  }
}

class PaymentHistoryTileSkeleton extends StatelessWidget {
  const PaymentHistoryTileSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: CatchInsets.contentVertical,
      child: Padding(
        padding: CatchInsets.paymentHistoryTileContent,
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  CatchSkeleton.text(width: CatchLayout.skeletonTextLongWidth),
                  gapH8,
                  CatchSkeleton.text(
                    width: CatchLayout.skeletonTextSecondaryWidth,
                  ),
                  gapH6,
                  CatchSkeleton.text(width: CatchLayout.skeletonTextWideWidth),
                ],
              ),
            ),
            gapW16,
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                CatchSkeleton.text(width: CatchLayout.skeletonTextStatusWidth),
                gapH8,
                CatchSkeleton.box(
                  width: CatchLayout.skeletonTextActionWidth,
                  height: CatchSpacing.s5,
                  radius: CatchRadius.pill,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class PaymentHistoryTile extends StatelessWidget {
  const PaymentHistoryTile({super.key, required this.row});

  final PaymentHistoryRow row;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final payment = row.payment;
    final eventTitle =
        row.eventTitle ??
        context.l10n.coreAppErrorMessageVisiblecopyEventUnavailable;
    final statusPresentation = paymentStatusPresentation(payment, context.l10n);

    return Semantics(
      button: true,
      label: context.l10n.paymentsPaymentHistoryScreenLabelPaymentForEventtitle(
        eventTitle: eventTitle,
      ),
      child: Padding(
        padding: CatchInsets.contentVertical,
        child: InkWell(
          key: PaymentHistoryKeys.paymentTile(payment.id),
          borderRadius: BorderRadius.circular(CatchRadius.md),
          onTap: () => _showDetailSheet(context, eventTitle),
          child: Padding(
            padding: CatchInsets.paymentHistoryTileContent,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                CatchText(eventTitle, variant: CatchTextVariant.sectionTitle),
                gapH4,
                CatchText(
                  AppTimeFormatters.dateTime(payment.createdAt),
                  variant: CatchTextVariant.supporting,
                  color: t.ink2,
                ),
                gapH8,
                Wrap(
                  spacing: CatchSpacing.s2,
                  runSpacing: CatchSpacing.s2,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: [
                    Text(
                      EventFormatters.priceInPaise(
                        payment.amount,
                        currencyCode: payment.currency,
                      ),
                      style: CatchTextStyles.statCompact(context),
                    ),
                    CatchBadge.status(
                      label: statusPresentation.label,
                      tone: statusPresentation.tone,
                    ),
                  ],
                ),
                if (statusPresentation.detail case final detail?) ...[
                  gapH4,
                  CatchText(
                    detail,
                    variant: CatchTextVariant.supporting,
                    color: t.ink2,
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }

  void _showDetailSheet(BuildContext context, String eventTitle) {
    final t = CatchTokens.of(context);

    showCatchBottomSheet(
      context: context,
      backgroundColor: t.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(
          top: Radius.circular(CatchRadius.lg),
        ),
      ),
      builder: (sheetContext) {
        return PaymentReceiptSheet(
          payment: row.payment,
          eventTitle: eventTitle,
          onHelp: () {
            Navigator.of(sheetContext).pop();
            showCatchNotice(
              context,
              context.l10n.paymentsHistorySupportMessage,
            );
          },
        );
      },
    );
  }
}

class PaymentReceiptSheet extends StatelessWidget {
  const PaymentReceiptSheet({
    super.key,
    required this.payment,
    required this.eventTitle,
    this.onHelp,
  });

  final Payment payment;
  final String eventTitle;
  final VoidCallback? onHelp;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final statusPresentation = paymentStatusPresentation(payment, context.l10n);

    return SafeArea(
      bottom: false,
      child: SingleChildScrollView(
        child: CatchSheet(
          title: eventTitle,
          padding: CatchInsets.pageBody.copyWith(
            top: CatchSpacing.s3,
            bottom: CatchSpacing.s0,
          ),
          child: CatchFieldLanes.custom(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Wrap(
                  spacing: CatchSpacing.s2,
                  runSpacing: CatchSpacing.s2,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: [
                    CatchBadge.status(
                      label: statusPresentation.label,
                      tone: statusPresentation.tone,
                    ),
                    CatchText(
                      EventFormatters.priceInPaise(
                        payment.amount,
                        currencyCode: payment.currency,
                      ),
                      variant: CatchTextVariant.titleL,
                    ),
                  ],
                ),
                gapH20,
                const CatchDivider.section(),
                gapH20,
                CatchField.read(
                  copy: catchFieldCopy(context.l10n),
                  title:
                      context.l10n.paymentsPaymentHistoryScreenTitlePaymentId,
                  body: payment.paymentId,
                ),
                gapH12,
                CatchField.read(
                  copy: catchFieldCopy(context.l10n),
                  title: context.l10n.paymentsPaymentHistoryScreenTitleOrderId,
                  body: payment.orderId,
                ),
                gapH12,
                CatchField.read(
                  copy: catchFieldCopy(context.l10n),
                  title: context.l10n.paymentsPaymentHistoryScreenTitleEventId,
                  body: payment.eventId,
                ),
                gapH12,
                CatchField.read(
                  copy: catchFieldCopy(context.l10n),
                  title: context.l10n.paymentsPaymentHistoryScreenTitleDate,
                  body: AppTimeFormatters.dateTime(payment.createdAt),
                ),
                if (statusPresentation.detail case final detail?) ...[
                  gapH12,
                  CatchField.read(
                    copy: catchFieldCopy(context.l10n),
                    title: context.l10n.paymentsPaymentHistoryScreenTitleStatus,
                    body: detail,
                  ),
                ],
                if (payment.signUpFailed ||
                    payment.cancellationRefund?.state ==
                        PaymentCancellationRefundState.reviewRequired) ...[
                  gapH20,
                  const CatchDivider.section(),
                  gapH16,
                  SizedBox(
                    width: double.infinity,
                    child: CatchButton(
                      label: context
                          .l10n
                          .paymentsPaymentHistoryScreenLabelGetHelpWithThis,
                      onPressed: onHelp,
                      leading: Icon(CatchIcons.helpOutlineRounded),
                      variant: CatchButtonVariant.secondary,
                      foregroundColor: t.warning,
                      borderColor: t.warning.withValues(
                        alpha: CatchOpacity.paymentHelpBorder,
                      ),
                      fullWidth: true,
                    ),
                  ),
                ],
                const CatchScrollTerminalGap(),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

({String label, CatchBadgeTone tone, String? detail}) paymentStatusPresentation(
  Payment payment,
  AppLocalizations l10n,
) {
  final refund = payment.cancellationRefund;
  if (refund != null) {
    final returned = EventFormatters.priceInPaise(
      refund.confirmedAmountMinor,
      currencyCode: payment.currency,
    );
    return switch (refund.state) {
      PaymentCancellationRefundState.reviewRequired => (
        label: l10n.paymentsCancellationRefundReview,
        tone: CatchBadgeTone.danger,
        detail: l10n.paymentsPaymentHistoryScreenDetailYourRefundNeedsAttention,
      ),
      PaymentCancellationRefundState.pending => (
        label: l10n.paymentsPaymentHistoryScreenLabelRefundPending,
        tone: CatchBadgeTone.warning,
        detail: l10n.paymentsCancellationRefundPending(
          amount: EventFormatters.priceInPaise(
            refund.targetAmountMinor - refund.confirmedAmountMinor,
            currencyCode: payment.currency,
          ),
        ),
      ),
      PaymentCancellationRefundState.complete
          when refund.targetAmountMinor == 0 =>
        (
          label: l10n.paymentsCancellationLabel,
          tone: CatchBadgeTone.brand,
          detail: l10n.paymentsCancellationNoRefund,
        ),
      PaymentCancellationRefundState.complete => (
        label: refund.confirmedAmountMinor == payment.amount
            ? l10n.paymentsPaymentHistoryScreenLabelRefunded
            : l10n.paymentsCancellationPartialRefund,
        tone: CatchBadgeTone.brand,
        detail: l10n.paymentsCancellationRefundReturned(amount: returned),
      ),
    };
  }
  if (payment.signUpFailed) {
    return switch (payment.status) {
      PaymentStatus.refunded => (
        label: l10n.paymentsPaymentHistoryScreenLabelRefunded,
        tone: CatchBadgeTone.brand,
        detail: l10n.paymentsPaymentHistoryScreenDetailBookingFailedButYour,
      ),
      PaymentStatus.refundFailed => (
        label: l10n.paymentsPaymentHistoryScreenLabelRefundPending,
        tone: CatchBadgeTone.danger,
        detail: l10n.paymentsPaymentHistoryScreenDetailNoSpotWasReserved,
      ),
      _ => (
        label: l10n.paymentsPaymentHistoryScreenLabelBookingFailed,
        tone: CatchBadgeTone.warning,
        detail: l10n.paymentsPaymentHistoryScreenDetailNoSpotWasReservedd0a580,
      ),
    };
  }

  return switch (payment.status) {
    PaymentStatus.completed => (
      label: l10n.paymentsPaymentHistoryScreenLabelPaid,
      tone: CatchBadgeTone.success,
      detail: null,
    ),
    PaymentStatus.refunded => (
      label: l10n.paymentsPaymentHistoryScreenLabelRefunded,
      tone: CatchBadgeTone.brand,
      detail: null,
    ),
    PaymentStatus.failed => (
      label: l10n.paymentsPaymentHistoryScreenLabelFailed,
      tone: CatchBadgeTone.danger,
      detail: null,
    ),
    PaymentStatus.refundFailed => (
      label: l10n.paymentsPaymentHistoryScreenLabelRefundPending,
      tone: CatchBadgeTone.danger,
      detail: l10n.paymentsPaymentHistoryScreenDetailYourRefundNeedsAttention,
    ),
    PaymentStatus.pending => (
      label: l10n.paymentsPaymentHistoryScreenLabelPending,
      tone: CatchBadgeTone.warning,
      detail: null,
    ),
  };
}
