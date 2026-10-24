import 'dart:async';

import 'package:catch_dating_app/clubs/data/clubs_repository.dart';
import 'package:catch_dating_app/core/app_error_message.dart';
import 'package:catch_dating_app/core/external_share.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_async_boundary.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_localized_error_scaffold.dart';
import 'package:catch_dating_app/core/widgets/event_activity_visuals.dart';
import 'package:catch_dating_app/events/data/event_repository.dart';
import 'package:catch_dating_app/events/domain/event.dart';
import 'package:catch_dating_app/events/domain/event_formatters.dart';
import 'package:catch_dating_app/events/presentation/attendee_event_share_controller.dart';
import 'package:catch_dating_app/events/shared/event_joined_celebration_screen.dart';
import 'package:catch_dating_app/events/shared/event_share_card.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/payments/data/payment_history_repository.dart';
import 'package:catch_dating_app/payments/domain/payment.dart';
import 'package:catch_dating_app/payments/domain/payment_confirmation_data.dart';
import 'package:catch_dating_app/payments/presentation/payment_confirmation_controller.dart';
import 'package:catch_dating_app/payments/presentation/payment_confirmation_keys.dart';
import 'package:catch_dating_app/payments/presentation/payment_confirmation_loading_screen.dart';
import 'package:catch_dating_app/routing/go_router.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

export 'package:catch_dating_app/payments/presentation/payment_confirmation_loading_screen.dart';

class PaymentConfirmationScreen extends ConsumerWidget {
  const PaymentConfirmationScreen({super.key, required this.data});

  final PaymentConfirmationData data;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final eventAsync = ref.watch(watchEventProvider(data.eventId));

    return CatchAsyncBoundary<Event?>(
      value: eventAsync,
      onRetry: () => ref.invalidate(watchEventProvider(data.eventId)),
      loadingBuilder: (_) => const PaymentConfirmationLoadingScreen(),
      errorBuilder: (_, e, _, onBoundaryRetry) => CatchLocalizedErrorScaffold(
        e,
        context: AppErrorContext.payments,
        onRetry: onBoundaryRetry,
      ),
      builder: (context, event) {
        if (event == null) {
          return CatchErrorScaffold(
            title: context
                .l10n
                .paymentsPaymentConfirmationScreenTitleEventNotFound,
            message: context
                .l10n
                .paymentsPaymentConfirmationScreenMessageThisEventIsNo,
            actions: const [CatchErrorBackButton()],
          );
        }
        if (data.isPendingExternalCheckout) {
          return PaymentPendingBody(data: data, event: event);
        }
        return PaymentConfirmedBody(data: data, event: event);
      },
    );
  }
}

class PaymentPendingBody extends ConsumerWidget {
  const PaymentPendingBody({
    super.key,
    required this.data,
    required this.event,
  });

  final PaymentConfirmationData data;
  final Event event;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final paymentAsync = ref.watch(watchPaymentProvider(data.paymentId));
    final payment = catchAsyncStateFromAsyncValue(paymentAsync).value;
    if (payment != null &&
        payment.status == PaymentStatus.completed &&
        !payment.signUpFailed &&
        payment.cancellationRefund == null) {
      return PaymentConfirmedBody(
        data: PaymentConfirmationData(
          paymentId: payment.paymentId,
          orderId: payment.orderId,
          amountInPaise: payment.amount,
          currency: payment.currency,
          eventId: payment.eventId,
          provider: data.provider,
          checkoutUrl: data.checkoutUrl,
        ),
        event: event,
      );
    }

    final cancelled =
        payment?.cancellationRefund != null ||
        payment?.status == PaymentStatus.refunded;
    final failed =
        payment?.status == PaymentStatus.failed ||
        payment?.signUpFailed == true;
    final controller = ref.watch(paymentConfirmationControllerProvider);
    return PaymentPendingCheckoutBody(
      data: data,
      event: event,
      failed: failed,
      cancelled: cancelled,
      providerLabel: _providerLabel(data.provider),
      onOpenCheckout: cancelled || data.checkoutUrl == null
          ? null
          : () => unawaited(controller.openCheckout(data.checkoutUrl!)),
      onViewPaymentHistory: () =>
          context.goNamed(Routes.paymentHistoryScreen.name),
      onBackToEvent: () => context.goNamed(
        Routes.eventDetailScreen.name,
        pathParameters: {'clubId': event.clubId, 'eventId': event.id},
        extra: event,
      ),
    );
  }
}

class PaymentPendingCheckoutBody extends StatelessWidget {
  const PaymentPendingCheckoutBody({
    super.key,
    required this.data,
    required this.event,
    required this.failed,
    this.cancelled = false,
    required this.providerLabel,
    required this.onViewPaymentHistory,
    required this.onBackToEvent,
    this.onOpenCheckout,
  });

  final PaymentConfirmationData data;
  final Event event;
  final bool failed;
  final bool cancelled;
  final String providerLabel;
  final VoidCallback? onOpenCheckout;
  final VoidCallback onViewPaymentHistory;
  final VoidCallback onBackToEvent;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    return CatchScaffold.standalone(
      safeArea: CatchScaffoldPlacement.none,
      backgroundColor: t.bg,
      body: Stack(
        children: [
          Positioned.fill(child: PaymentCheckoutHeader(event: event)),
          Positioned.fill(
            child: ColoredBox(
              color: t.ink.withValues(alpha: CatchOpacity.paymentCheckoutScrim),
            ),
          ),
          Align(
            alignment: Alignment.bottomCenter,
            child: SafeArea(
              top: false,
              child: SingleChildScrollView(
                reverse: true,
                child: PaymentCheckoutSheet(
                  data: data,
                  event: event,
                  failed: failed,
                  cancelled: cancelled,
                  providerLabel: providerLabel,
                  onOpenCheckout: onOpenCheckout,
                  onViewPaymentHistory: onViewPaymentHistory,
                  onBackToEvent: onBackToEvent,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class PaymentCheckoutHeader extends StatelessWidget {
  const PaymentCheckoutHeader({super.key, required this.event});

  final Event event;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final visual = eventActivityVisual(event.activityKind, context: context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SizedBox(
          height: CatchLayout.paymentCheckoutBackdropHeight,
          child: CatchSurface(
            tone: CatchSurfaceTone.transparent,
            radius: 0,
            padding: CatchInsets.pageBody.copyWith(
              top: CatchSpacing.s5,
              bottom: CatchSpacing.s5,
            ),
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [visual.accent, visual.deep],
            ),
            child: Align(
              alignment: Alignment.bottomLeft,
              child: CatchText(
                event.title,
                maxLines: 2,

                variant: CatchTextVariant.headline,
                color: t.primaryInk,
              ),
            ),
          ),
        ),
        Padding(
          padding: CatchInsets.pageBody.copyWith(
            top: CatchSpacing.s4,
            bottom: 0,
          ),
          child: CatchText(
            context.l10n
                .paymentsPaymentConfirmationScreenTextLongdatelabelTimerangelabelLocationnamePriceinpaise(
                  longDateLabel: event.longDateLabel,
                  timeRangeLabel: event.timeRangeLabel,
                  locationName: event.locationName,
                  priceInPaise: EventFormatters.priceInPaise(
                    event.priceInPaise,
                    currencyCode: event.currency,
                  ),
                  capacityLimit: event.capacityLimit,
                ),
            variant: CatchTextVariant.bodyM,
            color: t.ink2,
          ),
        ),
        const Spacer(),
      ],
    );
  }
}

class PaymentCheckoutSheet extends StatelessWidget {
  const PaymentCheckoutSheet({
    super.key,
    required this.data,
    required this.event,
    required this.failed,
    this.cancelled = false,
    required this.providerLabel,
    required this.onViewPaymentHistory,
    required this.onBackToEvent,
    this.onOpenCheckout,
  });

  final PaymentConfirmationData data;
  final Event event;
  final bool failed;
  final bool cancelled;
  final String providerLabel;
  final VoidCallback? onOpenCheckout;
  final VoidCallback onViewPaymentHistory;
  final VoidCallback onBackToEvent;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final statusTone = failed ? CatchBadgeTone.danger : CatchBadgeTone.warning;
    final medallionColor = failed ? t.danger : t.primary;
    final medallionFill = failed
        ? t.danger.withValues(alpha: CatchOpacity.dangerFill)
        : t.primarySoft;
    final title = cancelled
        ? context.l10n.paymentsCancellationLabel
        : failed
        ? context.l10n.paymentsPaymentConfirmationScreenTitlePaymentNotCompleted
        : context.l10n.paymentsPaymentConfirmationScreenTitleCheckoutIsWaiting;
    final message = cancelled
        ? context.l10n.paymentsCancellationCheckoutMessage
        : failed
        ? context.l10n
              .paymentsPaymentConfirmationScreenMessageProviderlabelDidNotComplete(
                providerLabel: providerLabel,
              )
        : context.l10n
              .paymentsPaymentConfirmationScreenMessageFinishPaymentInProviderlabel(
                providerLabel: providerLabel,
                providerLabel2: providerLabel,
              );

    return CatchSurface(
      backgroundColor: t.surface,
      borderRole: CatchBorderRole.separator,
      borderRadius: const BorderRadius.vertical(
        top: Radius.circular(CatchRadius.heroCard),
      ),
      width: double.infinity,
      padding: CatchInsets.pageBody.copyWith(
        top: CatchSpacing.s3,
        bottom: CatchSpacing.s6,
      ),
      child: ConstrainedBox(
        constraints: const BoxConstraints(
          maxWidth: CatchLayout.maxContentWidth,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const CatchSheetDragIndicator(),
            gapH16,
            Align(
              alignment: Alignment.centerLeft,
              child: SizedBox(
                width: CatchLayout.paymentCheckoutMedallionExtent,
                height: CatchLayout.paymentCheckoutMedallionExtent,
                child: ColoredBox(
                  color: medallionFill,
                  child: Icon(
                    failed
                        ? CatchIcons.errorOutlineRounded
                        : CatchIcons.receiptLongOutlined,
                    color: medallionColor,
                    size: CatchIcon.statusMedallion,
                  ),
                ),
              ),
            ),
            gapH14,
            Text(
              title,
              style: CatchTextStyles.headlineS(context, color: t.ink),
            ),
            gapH8,
            CatchText(message, variant: CatchTextVariant.bodyM, color: t.ink2),
            gapH18,
            Padding(
              padding: CatchInsets.content,
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        CatchText(
                          event.title,
                          maxLines: 1,

                          variant: CatchTextVariant.sectionTitle,
                          color: t.ink,
                        ),
                        gapH4,
                        Text(
                          EventFormatters.priceInPaise(
                            data.amountInPaise,
                            currencyCode: data.currency,
                          ),
                          style: CatchTextStyles.mono(
                            context,
                            color: t.ink2,
                          ).copyWith(fontWeight: FontWeight.w600),
                        ),
                      ],
                    ),
                  ),
                  gapW12,
                  CatchBadge(
                    label: cancelled
                        ? context.l10n.paymentsCancellationLabel
                        : failed
                        ? context
                              .l10n
                              .paymentsPaymentConfirmationScreenLabelFailed
                        : context
                              .l10n
                              .paymentsPaymentConfirmationScreenLabelPending,
                    tone: statusTone,
                  ),
                ],
              ),
            ),
            gapH18,
            if (!cancelled && onOpenCheckout != null) ...[
              CatchButton(
                label: failed
                    ? context.l10n
                          .paymentsPaymentConfirmationScreenLabelTryProviderlabelAgain(
                            providerLabel: providerLabel,
                          )
                    : context.l10n
                          .paymentsPaymentConfirmationScreenLabelOpenProviderlabelCheckout(
                            providerLabel: providerLabel,
                          ),
                onPressed: onOpenCheckout,
                leading: Icon(CatchIcons.openInNewRounded),
                fullWidth: true,
              ),
              gapH10,
            ],
            CatchButton(
              label: context
                  .l10n
                  .paymentsPaymentConfirmationScreenLabelViewPaymentHistory,
              onPressed: onViewPaymentHistory,
              variant: CatchButtonVariant.secondary,
              leading: Icon(CatchIcons.receiptLongOutlined),
              fullWidth: true,
            ),
            gapH4,
            CatchButton(
              label: context
                  .l10n
                  .paymentsPaymentConfirmationScreenLabelBackToEvent,
              onPressed: onBackToEvent,
              variant: CatchButtonVariant.ghost,
              leading: Icon(CatchIcons.eventOutlined),
              fullWidth: true,
            ),
          ],
        ),
      ),
    );
  }
}

String _providerLabel(String provider) {
  if (provider.isEmpty) return 'Checkout';
  return provider[0].toUpperCase() + provider.substring(1);
}

class PaymentConfirmedBody extends ConsumerWidget {
  const PaymentConfirmedBody({
    super.key,
    required this.data,
    required this.event,
  });

  final PaymentConfirmationData data;
  final Event event;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final clubAsync = ref.watch(watchClubProvider(event.clubId));
    final clubName = catchAsyncStateFromAsyncValue(clubAsync).value?.name;
    final controller = ref.watch(paymentConfirmationControllerProvider);
    final share = ref.watch(externalShareControllerProvider);

    return PaymentConfirmationBody(
      data: data,
      event: event,
      clubName: clubName,
      onAddToCalendar: () => unawaited(controller.addToCalendar(event)),
      onOpenDirections: () => unawaited(controller.openDirections(event)),
      onInviteFriend: () => unawaited(
        showTrackedAttendeeEventShareCardSheet(
          context,
          event: event,
          share: share,
          actions: ref.read(attendeeEventShareActionsProvider),
        ),
      ),
      onReferralShare: () => unawaited(
        showTrackedAttendeeEventShareCardSheet(
          context,
          event: event,
          share: share,
          actions: ref.read(attendeeEventShareActionsProvider),
        ),
      ),
      onViewEvent: () => context.goNamed(
        Routes.eventDetailScreen.name,
        pathParameters: {'clubId': event.clubId, 'eventId': event.id},
        extra: event,
      ),
      onBackHome: () => context.goNamed(Routes.dashboardScreen.name),
    );
  }
}

class PaymentConfirmationBody extends StatelessWidget {
  const PaymentConfirmationBody({
    super.key,
    required this.data,
    required this.event,
    required this.onAddToCalendar,
    required this.onOpenDirections,
    required this.onInviteFriend,
    required this.onReferralShare,
    required this.onViewEvent,
    required this.onBackHome,
    this.clubName,
  });

  final PaymentConfirmationData data;
  final Event event;
  final String? clubName;
  final VoidCallback onAddToCalendar;
  final VoidCallback onOpenDirections;
  final VoidCallback onInviteFriend;
  final VoidCallback onReferralShare;
  final VoidCallback onViewEvent;
  final VoidCallback onBackHome;

  static const double _iconBoxSize = CatchSpacing.s9;
  static const double _tileSpacing = CatchSpacing.s3;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final actions = [
      PaymentConfirmationAction(
        key: PaymentConfirmationKeys.addToCalendar,
        icon: CatchIcons.calendarMonthOutlined,
        label: context.l10n.paymentsPaymentConfirmationScreenLabelAddToCalendar,
        onPressed: onAddToCalendar,
      ),
      PaymentConfirmationAction(
        key: PaymentConfirmationKeys.directions,
        icon: CatchIcons.directionsOutlined,
        label: context.l10n.paymentsPaymentConfirmationScreenLabelGetDirections,
        onPressed: onOpenDirections,
      ),
      PaymentConfirmationAction(
        key: PaymentConfirmationKeys.inviteFriend,
        icon: CatchIcons.platformShare(platform: Theme.of(context).platform),
        label: context.l10n.paymentsPaymentConfirmationScreenLabelInviteFriend,
        onPressed: onInviteFriend,
      ),
    ];

    return EventJoinedCelebrationScreen(
      event: event,
      clubName: clubName,
      paymentData: data,
      supplementalChildren: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            for (var index = 0; index < actions.length; index++) ...[
              Expanded(
                child: Opacity(
                  opacity: actions[index].isEnabled ? 1 : 0.7,
                  child: KeyedSubtree(
                    key: actions[index].key,
                    child: Semantics(
                      label: actions[index].label,
                      child: CatchSurface(
                        onTap: actions[index].onPressed,
                        padding: CatchInsets.content,
                        radius: CatchRadius.md,
                        borderRole: CatchBorderRole.separator,
                        backgroundColor: t.surface,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            CatchIconTile(
                              icon: actions[index].icon,
                              iconColor: t.primary,
                              backgroundColor: t.primarySoft,
                              borderColor: t.primarySoft,
                              size: _iconBoxSize,
                              iconSize: CatchIcon.md,
                              radius: CatchRadius.sm,
                            ),
                            gapH8,
                            Text(
                              actions[index].label,
                              style: CatchTextStyles.labelL(context),
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              ),
              if (index < actions.length - 1)
                const SizedBox(width: _tileSpacing),
            ],
          ],
        ),
        const PaymentConfirmationNotice(),
        PaymentReferralBanner(onShare: onReferralShare),
      ],
      backHomeKey: PaymentConfirmationKeys.backHome,
      onViewEvent: onViewEvent,
      onBackHome: onBackHome,
    );
  }
}

class PaymentConfirmationAction {
  const PaymentConfirmationAction({
    this.key,
    required this.icon,
    required this.label,
    this.onPressed,
  });

  final Key? key;
  final IconData icon;
  final String label;
  final VoidCallback? onPressed;

  bool get isEnabled => onPressed != null;
}

class PaymentConfirmationNotice extends StatelessWidget {
  const PaymentConfirmationNotice({super.key});

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    return CatchSurface(
      tone: CatchSurfaceTone.primarySoft,
      padding: CatchInsets.tileContentCompact,
      radius: CatchRadius.md,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CatchText(
            context.l10n.paymentsPaymentConfirmationScreenTextHeadsUp,
            variant: CatchTextVariant.statusLabel,
            color: t.primary,
          ),
          gapH6,
          CatchText(
            context.l10n.paymentsPaymentConfirmationScreenTextBringAWaterBottle,
            variant: CatchTextVariant.bodyM,
            color: t.ink,
          ),
        ],
      ),
    );
  }
}

class PaymentReferralBanner extends StatelessWidget {
  const PaymentReferralBanner({super.key, required this.onShare});

  final VoidCallback onShare;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);

    return CatchSurface(
      key: PaymentConfirmationKeys.referralShare,
      onTap: onShare,
      padding: CatchInsets.tileContentCompact,
      radius: CatchRadius.md,
      borderSpec: CatchBorder.resolve(
        t,
        CatchBorderRole.selected,
        color: t.primary.withValues(alpha: CatchOpacity.paymentReferralBorder),
      ),
      child: Row(
        children: [
          Icon(CatchIcons.groupAddOutlined, color: t.primary),
          gapW12,
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                CatchText(
                  context
                      .l10n
                      .paymentsPaymentConfirmationScreenTextBringSomeoneYouActually,
                  variant: CatchTextVariant.sectionTitle,
                ),
                gapH2,
                CatchText(
                  context
                      .l10n
                      .paymentsPaymentConfirmationScreenTextTheBestInvitesHappen,
                  variant: CatchTextVariant.bodyM,
                  color: t.ink2,
                ),
              ],
            ),
          ),
          Text(
            context.l10n.paymentsPaymentConfirmationScreenTextShare,
            style: CatchTextStyles.labelL(context, color: t.primary),
          ),
        ],
      ),
    );
  }
}
