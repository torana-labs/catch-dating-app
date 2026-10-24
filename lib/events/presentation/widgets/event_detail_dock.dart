import 'dart:async';
import 'package:catch_dating_app/auth/data/auth_repository.dart';
import 'package:catch_dating_app/core/app_error_message.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_dating_app/core/theme/activity_palette.dart';
import 'package:catch_dating_app/events/data/event_repository.dart';
import 'package:catch_dating_app/events/domain/event.dart';
import 'package:catch_dating_app/events/domain/event_formatters.dart';
import 'package:catch_dating_app/events/domain/event_participation.dart';
import 'package:catch_dating_app/events/presentation/event_action_keys.dart';
import 'package:catch_dating_app/events/presentation/event_booking_controller.dart';
import 'package:catch_dating_app/events/presentation/event_detail_screen_state.dart';
import 'package:catch_dating_app/events/shared/event_joined_celebration_screen.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/organizers/domain/organizer_supply_capabilities.dart';
import 'package:catch_dating_app/routing/go_router.dart';
import 'package:catch_dating_app/user_profile/domain/user_profile.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/experimental/mutation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

class EventBookingDock extends StatelessWidget {
  const EventBookingDock({
    super.key,
    required this.label,
    required this.onPressed,
    this.leadingContent,
    this.buttonKey,
    this.isLoading = false,
    this.backgroundColor,
    this.dividerColor,
    this.buttonAccentColor,
    this.catchLine,
    this.catchLineAccent,
    this.footnote,
    this.errorMessage,
  });

  final String label;
  final VoidCallback? onPressed;
  final Widget? leadingContent;
  final Key? buttonKey;
  final bool isLoading;
  final Color? backgroundColor;
  final Color? dividerColor;
  final Color? buttonAccentColor;
  final String? catchLine;
  final Color? catchLineAccent;
  final String? footnote;
  final String? errorMessage;

  @override
  Widget build(BuildContext context) {
    final error = errorMessage;
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        if (error != null) CatchBanner.error(message: error),
        CatchDock.primary(
          label: label,
          onPressed: onPressed,
          leading: leadingContent,
          buttonKey: buttonKey,
          isLoading: isLoading,
          backgroundColor: backgroundColor,
          dividerColor: dividerColor,
          buttonAccentColor: buttonAccentColor,
          catchLine: catchLine,
          catchLineAccent: catchLineAccent,
          footnote: footnote,
        ),
      ],
    );
  }
}

class EventDetailDock extends ConsumerWidget {
  const EventDetailDock({
    super.key,
    required this.event,
    required this.userProfile,
    required this.clubId,
    required this.participation,
    this.organizerCapabilities =
        const OrganizerSupplyCapabilities.claimedManaged(),
    this.isSaved = false,
    this.isHosted = false,
    this.isClubMember = false,
    this.inviteCode,
    this.inviteLinkId,
    this.now,
    this.darkSurface = false,
  });

  final Event event;
  final UserProfile userProfile;
  final String clubId;
  final EventParticipation? participation;
  final OrganizerSupplyCapabilities organizerCapabilities;
  final bool isSaved;
  final bool isHosted;
  final bool isClubMember;
  final String? inviteCode;
  final String? inviteLinkId;
  final DateTime? now;
  final bool darkSurface;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (!organizerCapabilities.bookable) return const SizedBox.shrink();
    final t = CatchTokens.of(context);
    final activity = ActivityPalette.resolve(context, event.activityKind);
    final bookingAccent = activity.accent;
    final referenceNow = now ?? DateTime.now();
    final ctaBackground = darkSurface ? t.ink : null;
    final ctaDivider = darkSurface
        ? CatchTokens.editorialWhite.withValues(
            alpha: CatchOpacity.eventDetailCtaDarkDivider,
          )
        : null;

    final supportsPaid = ref.watch(
      eventPaidBookingSupportProvider(event.currency),
    );

    final authState = catchAsyncStateFromAsyncValue(ref.watch(uidProvider));
    final uid = authState.isSettledData ? authState.value : null;
    final viewerState = uid == null
        ? null
        : catchAsyncStateFromAsyncValue(
            ref.watch(
              eventViewerStateProvider(event.id, uid, inviteCode: inviteCode),
            ),
          );
    if (viewerState?.isSettledData != true || uid != userProfile.uid) {
      final error = viewerState?.error ?? authState.error;
      final pending = error == null;
      return EventBookingDock(
        label: pending
            ? context.l10n.eventsEventViewerCheckingBooking
            : context.l10n.eventsEventViewerRetryBooking,
        isLoading: pending,
        onPressed: pending || uid == null
            ? null
            : () => ref.invalidate(
                eventViewerStateProvider(event.id, uid, inviteCode: inviteCode),
              ),
        errorMessage: error == null
            ? null
            : appErrorMessage(
                error,
                l10n: context.l10n,
                context: AppErrorContext.event,
              ),
        backgroundColor: ctaBackground,
        dividerColor: ctaDivider,
      );
    }
    final viewer = viewerState!.value!;

    final bookMutation = ref.watch(EventBookingController.bookMutation);
    final cancelMutation = ref.watch(EventBookingController.cancelMutation);
    final joinWMutation = ref.watch(
      EventBookingController.joinWaitlistMutation,
    );
    final leaveWMutation = ref.watch(
      EventBookingController.leaveWaitlistMutation,
    );
    final acceptOfferMutation = ref.watch(
      EventBookingController.acceptWaitlistOfferMutation,
    );
    final declineOfferMutation = ref.watch(
      EventBookingController.declineWaitlistOfferMutation,
    );

    final errorMutation = [
      bookMutation,
      cancelMutation,
      joinWMutation,
      leaveWMutation,
      acceptOfferMutation,
      declineOfferMutation,
    ].firstWhere((m) => m.hasError, orElse: () => bookMutation);
    final mutationError = errorMutation.hasError
        ? (errorMutation as MutationError).error
        : null;
    for (final mutation in [
      EventBookingController.bookMutation,
      EventBookingController.cancelMutation,
      EventBookingController.joinWaitlistMutation,
      EventBookingController.leaveWaitlistMutation,
      EventBookingController.acceptWaitlistOfferMutation,
      EventBookingController.declineWaitlistOfferMutation,
    ]) {
      ref.listen(mutation, (previous, next) {
        if (previous?.isPending == true && !next.isPending) {
          ref.invalidate(
            eventViewerStateProvider(event.id, uid!, inviteCode: inviteCode),
          );
        }
      });
    }
    final dockState = eventDetailBookingDockStateFrom(
      l10n: context.l10n,
      event: event,
      userProfile: userProfile,
      participation: participation,
      isSaved: isSaved,
      isHosted: isHosted,
      currentViewer: viewer,
      now: referenceNow,
      hasInviteCode: inviteCode?.trim().isNotEmpty ?? false,
      supportsPaidBookings: supportsPaid,
      organizerCapabilities: organizerCapabilities,
      mutationState: EventDetailBookingDockMutationState(
        bookPending: bookMutation.isPending,
        cancelPending: cancelMutation.isPending,
        joinWaitlistPending: joinWMutation.isPending,
        leaveWaitlistPending: leaveWMutation.isPending,
        acceptWaitlistOfferPending: acceptOfferMutation.isPending,
        declineWaitlistOfferPending: declineOfferMutation.isPending,
        error: mutationError,
      ),
    );

    if (!dockState.visible) return const SizedBox.shrink();

    final errorMessage = dockState.error == null
        ? null
        : appErrorMessage(
            dockState.error!,
            l10n: context.l10n,
            context: AppErrorContext.event,
          );

    void handleBookingCompletion({
      required GoRouter? router,
      required NavigatorState navigator,
      required Object? paymentData,
    }) {
      _handleBookingCompletion(
        router: router,
        navigator: navigator,
        paymentData: paymentData,
      );
    }

    void runBookAction(BuildContext context) {
      final router = GoRouter.maybeOf(context);
      final navigator = Navigator.of(context, rootNavigator: true);
      EventBookingController.bookMutation.run(ref, (tx) async {
        final data = await tx
            .get(eventBookingControllerProvider.notifier)
            .book(
              event: event,
              user: userProfile,
              quotedPriceInPaise: viewer.quotedPriceInPaise,
              inviteCode: inviteCode,
              inviteLinkId: participation?.inviteLinkId ?? inviteLinkId,
            );
        handleBookingCompletion(
          router: router,
          navigator: navigator,
          paymentData: data,
        );
      });
    }

    void runAcceptWaitlistOfferAction(BuildContext context) {
      final router = GoRouter.maybeOf(context);
      final navigator = Navigator.of(context, rootNavigator: true);
      EventBookingController.acceptWaitlistOfferMutation.run(ref, (tx) async {
        final data = await tx
            .get(eventBookingControllerProvider.notifier)
            .acceptWaitlistOffer(
              event: event,
              user: userProfile,
              inviteCode: inviteCode,
              inviteLinkId: participation?.inviteLinkId ?? inviteLinkId,
            );
        handleBookingCompletion(
          router: router,
          navigator: navigator,
          paymentData: data,
        );
      });
    }

    void runBookingDockAction(
      BuildContext context,
      EventDetailBookingDockAction action,
    ) {
      switch (action) {
        case EventDetailBookingDockAction.none:
          return;
        case EventDetailBookingDockAction.openRunPreferences:
          _openRunPreferencesGate(context);
          return;
        case EventDetailBookingDockAction.book:
          runBookAction(context);
          return;
        case EventDetailBookingDockAction.cancelBooking:
          EventBookingController.cancelMutation.run(
            ref,
            (tx) async => tx
                .get(eventBookingControllerProvider.notifier)
                .cancelBooking(event: event),
          );
          return;
        case EventDetailBookingDockAction.joinWaitlist:
          EventBookingController.joinWaitlistMutation.run(
            ref,
            (tx) async => tx
                .get(eventBookingControllerProvider.notifier)
                .joinWaitlist(
                  event: event,
                  inviteCode: inviteCode,
                  inviteLinkId: inviteLinkId,
                ),
          );
          return;
        case EventDetailBookingDockAction.leaveWaitlist:
          EventBookingController.leaveWaitlistMutation.run(
            ref,
            (tx) async => tx
                .get(eventBookingControllerProvider.notifier)
                .leaveWaitlist(event: event),
          );
          return;
        case EventDetailBookingDockAction.acceptWaitlistOffer:
          runAcceptWaitlistOfferAction(context);
          return;
        case EventDetailBookingDockAction.declineWaitlistOffer:
          EventBookingController.declineWaitlistOfferMutation.run(
            ref,
            (tx) async => tx
                .get(eventBookingControllerProvider.notifier)
                .declineWaitlistOffer(event: event),
          );
          return;
      }
    }

    final leadingContent = switch (dockState.leadingKind) {
      EventDetailBookingDockLeadingKind.none => null,
      EventDetailBookingDockLeadingKind.price => EventPriceText(
        price: dockState.price ?? '',
        note: dockState.priceNote,
        warn: dockState.priceWarn,
      ),
      EventDetailBookingDockLeadingKind.booked => EventDockStatusText(
        icon: CatchIcons.checkCircleRounded,
        label: context.l10n.eventsEventDetailCtaLabelYouReIn,
      ),
      EventDetailBookingDockLeadingKind.waitlistOffer => WaitlistOfferNotice(
        expiresAt: dockState.waitlistOfferExpiresAt,
        isDeclining: dockState.isSecondaryLoading,
        onDecline: dockState.isSecondaryActionEnabled
            ? () => runBookingDockAction(context, dockState.secondaryAction)
            : null,
      ),
      EventDetailBookingDockLeadingKind.attended => EventDockStatusText(
        icon: CatchIcons.directionsRunRounded,
        label: context.l10n.eventsEventDetailCtaLabelCompleted,
      ),
    };

    return EventBookingDock(
      buttonKey: _buttonKeyFor(dockState.buttonKey),
      label: dockState.label,
      onPressed: dockState.isPrimaryActionEnabled
          ? () => runBookingDockAction(context, dockState.primaryAction)
          : null,
      isLoading: dockState.isLoading,
      buttonAccentColor: dockState.useAccent ? bookingAccent : null,
      catchLine: dockState.catchLine,
      catchLineAccent: dockState.catchLine == null ? null : bookingAccent,
      leadingContent: leadingContent,
      backgroundColor: ctaBackground,
      dividerColor: ctaDivider,
      errorMessage: errorMessage,
    );
  }

  Key? _buttonKeyFor(EventDetailBookingDockButtonKey? buttonKey) {
    return switch (buttonKey) {
      EventDetailBookingDockButtonKey.book => EventActionKeys.bookButton,
      EventDetailBookingDockButtonKey.cancelBooking =>
        EventActionKeys.cancelBookingButton,
      EventDetailBookingDockButtonKey.joinWaitlist =>
        EventActionKeys.joinWaitlistButton,
      null => null,
    };
  }

  void _handleBookingCompletion({
    required GoRouter? router,
    required NavigatorState navigator,
    required Object? paymentData,
  }) {
    if (paymentData != null) {
      if (router == null) return;
      unawaited(
        router.pushNamed(
          Routes.paymentConfirmationScreen.name,
          extra: paymentData,
        ),
      );
      return;
    }

    unawaited(
      navigator.push(
        MaterialPageRoute<void>(
          fullscreenDialog: true,
          builder: (routeContext) => EventJoinedCelebrationScreen(
            event: event,
            onViewEvent: () => Navigator.of(routeContext).pop(),
            onBackHome: () {
              Navigator.of(routeContext).pop();
              router?.goNamed(Routes.dashboardScreen.name);
            },
          ),
        ),
      ),
    );
  }
}

void _openRunPreferencesGate(BuildContext context) {
  final router = GoRouter.maybeOf(context);
  if (router == null) return;
  router.push(
    runPreferencesCompletionLocation(
      from: GoRouterState.of(context).uri.toString(),
    ),
  );
}

class EventPriceText extends StatelessWidget {
  const EventPriceText({
    super.key,
    required this.price,
    this.note,
    this.warn = false,
  });

  final String price;

  /// Secondary line under the price. Defaults to "per person"; when [warn] is
  /// true it renders as a warning-toned tracked-mono scarcity note.
  final String? note;
  final bool warn;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(price, style: CatchTextStyles.numericLarge(context)),
        warn
            ? Text(
                (note ?? '').toUpperCase(),
                style: CatchTextStyles.monoLabel(context, color: t.warning),
              )
            : CatchText(
                note ?? context.l10n.eventsEventDetailCtaTextPerPerson,
                variant: CatchTextVariant.supporting,
                color: t.ink2,
              ),
      ],
    );
  }
}

class WaitlistOfferNotice extends StatelessWidget {
  const WaitlistOfferNotice({
    super.key,
    required this.expiresAt,
    required this.isDeclining,
    required this.onDecline,
  });

  final DateTime? expiresAt;
  final bool isDeclining;
  final VoidCallback? onDecline;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final expiresLabel = expiresAt == null
        ? context.l10n.eventsEventDetailCtaVisiblecopyOfferActive
        : context.l10n.eventsEventDetailCtaVisiblecopyUntilTime(
            time: EventFormatters.time(expiresAt!),
          );
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        CatchText(
          expiresLabel,
          maxLines: 1,

          variant: CatchTextVariant.supporting,
          color: t.ink2,
        ),
        CatchButton.text(
          label: isDeclining
              ? context.l10n.eventsEventDetailCtaLabelDeclining
              : context.l10n.eventsEventDetailCtaLabelDecline,
          onPressed: onDecline,
          tone: CatchButtonTone.neutral,
          padding: EdgeInsets.zero,
        ),
      ],
    );
  }
}

class EventDockStatusText extends StatelessWidget {
  const EventDockStatusText({
    super.key,
    required this.icon,
    required this.label,
  });

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, color: t.primary, size: CatchIcon.md),
        gapW6,
        Text(label, style: CatchTextStyles.labelL(context)),
      ],
    );
  }
}
