import 'dart:async';

import 'package:catch_dating_app/auth/data/auth_repository.dart'
    show uidProvider;
import 'package:catch_dating_app/core/analytics/app_analytics.dart';
import 'package:catch_dating_app/core/app_error_message.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_localized_error_state.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_dating_app/cross_paths/data/cross_paths_repository.dart';
import 'package:catch_dating_app/cross_paths/domain/cross_paths_invitation.dart';
import 'package:catch_dating_app/cross_paths/domain/cross_paths_pair_hold.dart';
import 'package:catch_dating_app/cross_paths/presentation/cross_paths_invitation_controller.dart';
import 'package:catch_dating_app/events/data/event_repository.dart';
import 'package:catch_dating_app/events/domain/event.dart';
import 'package:catch_dating_app/events/domain/event_formatters.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/public_profile/data/public_profile_repository.dart';
import 'package:catch_dating_app/public_profile/domain/public_profile.dart';
import 'package:catch_dating_app/routing/go_router.dart';
import 'package:catch_dating_app/user_profile/data/user_profile_repository.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

class CrossPathsInvitationScreen extends ConsumerWidget {
  const CrossPathsInvitationScreen({super.key, required this.invitationId});

  final String invitationId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final invitationAsync = ref.watch(
      watchCrossPathsInvitationProvider(invitationId),
    );
    return CatchRouteScaffold(
      topBarBuilder: (context, scrolledUnder) => CatchTopBar.route(
        title: context.l10n.crossPathsInvitationScreenTitle,
        navigation: const CatchTopBarNavigation(
          mode: CatchTopBarNavigationMode.back,
        ),
        emphasis: scrolledUnder
            ? CatchTopBarEmphasis.divided
            : CatchTopBarEmphasis.plain,
      ),
      body: CatchRouteBody.standard(
        child: invitationAsync.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (error, _) => CatchLocalizedErrorState(
            error,
            context: AppErrorContext.explore,
            onRetry: () =>
                ref.invalidate(watchCrossPathsInvitationProvider(invitationId)),
          ),
          data: (invitation) => invitation == null
              ? CatchErrorState(
                  title:
                      context.l10n.crossPathsInvitationScreenUnavailableTitle,
                  message:
                      context.l10n.crossPathsInvitationScreenUnavailableBody,
                  actions: const [CatchErrorBackButton()],
                )
              : _InvitationDetail(invitation: invitation),
        ),
      ),
    );
  }
}

class _InvitationDetail extends ConsumerWidget {
  const _InvitationDetail({required this.invitation});

  final CrossPathsInvitation invitation;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final uidAsync = ref.watch(uidProvider);
    final uid = catchAsyncStateFromAsyncValue(uidAsync).value;
    if (uid == null || !invitation.participantIds.contains(uid)) {
      return CatchErrorState(
        title: context.l10n.crossPathsInvitationScreenUnavailableTitle,
        message: context.l10n.crossPathsInvitationScreenUnavailableBody,
        actions: const [CatchErrorBackButton()],
      );
    }
    final otherUid = invitation.senderUid == uid
        ? invitation.recipientUid
        : invitation.senderUid;
    final profileAsync = ref.watch(watchPublicProfileProvider(otherUid));
    final eventAsync = ref.watch(watchEventProvider(invitation.eventId));
    final pairHoldAsync = invitation.pairHoldId == null
        ? const AsyncValue<CrossPathsPairHold?>.data(null)
        : ref.watch(watchCrossPathsPairHoldProvider(invitation.pairHoldId!));
    final profileState = catchAsyncStateFromAsyncValue(profileAsync);
    final eventState = catchAsyncStateFromAsyncValue(eventAsync);
    final pairHoldState = catchAsyncStateFromAsyncValue(pairHoldAsync);
    if (profileState.isLoading ||
        eventState.isLoading ||
        pairHoldState.isLoading) {
      return const Center(child: CircularProgressIndicator());
    }
    if (profileState.hasError ||
        eventState.hasError ||
        pairHoldState.hasError) {
      return CatchLocalizedErrorState(
        profileState.error ?? eventState.error ?? pairHoldState.error!,
        context: AppErrorContext.explore,
        onRetry: () {
          ref.invalidate(watchPublicProfileProvider(otherUid));
          ref.invalidate(watchEventProvider(invitation.eventId));
          if (invitation.pairHoldId != null) {
            ref.invalidate(
              watchCrossPathsPairHoldProvider(invitation.pairHoldId!),
            );
          }
        },
      );
    }
    final profile = profileState.value;
    final event = eventState.value;
    if (profile == null || event == null) {
      return CatchErrorState(
        title: context.l10n.crossPathsInvitationScreenUnavailableTitle,
        message: context.l10n.crossPathsInvitationScreenUnavailableBody,
        actions: const [CatchErrorBackButton()],
      );
    }
    return _InvitationDetailBody(
      invitation: invitation,
      profile: profile,
      event: event,
      currentUid: uid,
      pairHold: pairHoldState.value,
    );
  }
}

class _InvitationDetailBody extends ConsumerWidget {
  const _InvitationDetailBody({
    required this.invitation,
    required this.profile,
    required this.event,
    required this.currentUid,
    required this.pairHold,
  });

  final CrossPathsInvitation invitation;
  final PublicProfile profile;
  final Event event;
  final String currentUid;
  final CrossPathsPairHold? pairHold;

  bool get isRecipient => invitation.recipientUid == currentUid;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = CatchTokens.of(context);
    final mutation = ref.watch(crossPathsInvitationControllerProvider);
    final invitationController = ref.read(
      crossPathsInvitationControllerProvider.notifier,
    );
    final analytics = ref.read(appAnalyticsProvider);
    final photo = profile.primaryPhotoThumbnailUrl;
    return CatchSectionList.responsive(
      emptyStateOmitted: true,
      sectionGap: CatchSpacing.s4,
      items: [
        CatchSectionListItem(
          child: CatchPolaroid(
            media: photo == null
                ? CatchImageFallbackSurface(icon: CatchIcons.personOutlined)
                : CatchNetworkImage(photo),
            kicker: context.l10n.crossPathsExploreCardLabelCrossPaths,
            name: '${profile.name}, ${profile.age}',
            meta: _statusCopy(context),
            showArrow: true,
            onTap: () => context.pushNamed(
              Routes.publicProfileScreen.name,
              pathParameters: {'uid': profile.uid},
              extra: profile,
            ),
          ),
        ),
        CatchSectionListItem(
          child: CatchSurface.card(
            padding: CatchInsets.content,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                CatchText(event.title, variant: CatchTextVariant.sectionTitle),
                gapH4,
                CatchText(
                  '${EventFormatters.shortDate(event.startTime)} · '
                  '${EventFormatters.time(event.startTime)} · '
                  '${event.meetingPoint}',
                  variant: CatchTextVariant.supporting,
                  color: t.ink2,
                ),
              ],
            ),
          ),
        ),
        if (pairHold != null)
          CatchSectionListItem(
            child: _PairHoldPanel(
              hold: pairHold!,
              event: event,
              currentUid: currentUid,
            ),
          ),
        CatchSectionListItem(
          child: _InvitationActions(
            invitation: invitation,
            isRecipient: isRecipient,
            loading: mutation.isLoading,
            onRespond: (accept) => _respond(
              context,
              invitationController,
              analytics,
              accept: accept,
            ),
            onCancel: () => _cancel(context, invitationController, analytics),
          ),
        ),
      ],
    );
  }

  String _statusCopy(BuildContext context) => switch (invitation.status) {
    CrossPathsInvitationStatus.pending =>
      isRecipient
          ? context.l10n.crossPathsInvitationScreenIncomingBody
          : context.l10n.crossPathsInvitationScreenOutgoingBody,
    CrossPathsInvitationStatus.accepted =>
      pairHold?.status == CrossPathsPairHoldStatus.active
          ? context.l10n.crossPathsPairInventoryStatusHeldNotBooked
          : context.l10n.crossPathsInvitationScreenAcceptedBody,
    _ => context.l10n.crossPathsInvitationStatusClosed,
  };

  Future<void> _respond(
    BuildContext context,
    CrossPathsInvitationController invitationController,
    AppAnalytics analytics, {
    required bool accept,
  }) async {
    try {
      final receipt = await invitationController.respond(
        invitationId: invitation.id,
        accept: accept,
      );
      analytics.logEvent(
        accept
            ? AnalyticsEvents.crossPathsInvitationAccepted
            : AnalyticsEvents.crossPathsInvitationDeclined,
        parameters: {AnalyticsParameters.eventId: invitation.eventId},
      );
      if (context.mounted && accept && receipt.conversationId != null) {
        context.goNamed(
          Routes.chatScreen.name,
          pathParameters: {'matchId': receipt.conversationId!},
        );
      }
    } catch (error) {
      if (context.mounted) {
        showCatchNoticeError(
          context,
          error,
          errorContext: AppErrorContext.explore,
        );
      }
    }
  }

  Future<void> _cancel(
    BuildContext context,
    CrossPathsInvitationController invitationController,
    AppAnalytics analytics,
  ) async {
    try {
      await invitationController.cancel(invitation.id);
      analytics.logEvent(
        AnalyticsEvents.crossPathsInvitationCancelled,
        parameters: {AnalyticsParameters.eventId: invitation.eventId},
      );
    } catch (error) {
      if (context.mounted) {
        showCatchNoticeError(
          context,
          error,
          errorContext: AppErrorContext.explore,
        );
      }
    }
  }
}

class _InvitationActions extends StatelessWidget {
  const _InvitationActions({
    required this.invitation,
    required this.isRecipient,
    required this.loading,
    required this.onRespond,
    required this.onCancel,
  });

  final CrossPathsInvitation invitation;
  final bool isRecipient;
  final bool loading;
  final ValueChanged<bool> onRespond;
  final VoidCallback onCancel;

  @override
  Widget build(BuildContext context) {
    if (invitation.status == CrossPathsInvitationStatus.pending &&
        isRecipient) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          CatchButton(
            label: context.l10n.crossPathsInvitationScreenActionAccept,
            fullWidth: true,
            status: (loading)
                ? CatchButtonStatus.loading
                : CatchButtonStatus.idle,
            onPressed: () => onRespond(true),
          ),
          gapH10,
          CatchButton(
            label: context.l10n.crossPathsInvitationScreenActionDecline,
            fullWidth: true,
            variant: CatchButtonVariant.secondary,
            onPressed: loading ? null : () => onRespond(false),
          ),
        ],
      );
    }
    if (invitation.status == CrossPathsInvitationStatus.pending) {
      return CatchButton(
        label: context.l10n.crossPathsInvitationActionCancel,
        fullWidth: true,
        status: (loading) ? CatchButtonStatus.loading : CatchButtonStatus.idle,
        variant: CatchButtonVariant.secondary,
        onPressed: onCancel,
      );
    }
    if (invitation.status == CrossPathsInvitationStatus.accepted) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          CatchButton(
            label: context.l10n.crossPathsInvitationActionOpenPlan,
            fullWidth: true,
            onPressed: invitation.conversationId == null
                ? null
                : () => context.pushNamed(
                    Routes.chatScreen.name,
                    pathParameters: {'matchId': invitation.conversationId!},
                  ),
          ),
          gapH10,
          CatchButton(
            label: context.l10n.crossPathsInvitationScreenActionCancelPlan,
            fullWidth: true,
            variant: CatchButtonVariant.secondary,
            status: (loading)
                ? CatchButtonStatus.loading
                : CatchButtonStatus.idle,
            onPressed: onCancel,
          ),
        ],
      );
    }
    return const SizedBox.shrink();
  }
}

class _PairHoldPanel extends ConsumerStatefulWidget {
  const _PairHoldPanel({
    required this.hold,
    required this.event,
    required this.currentUid,
  });

  final CrossPathsPairHold hold;
  final Event event;
  final String currentUid;

  @override
  ConsumerState<_PairHoldPanel> createState() => _PairHoldPanelState();
}

class _PairHoldPanelState extends ConsumerState<_PairHoldPanel> {
  Timer? _timer;
  bool _booking = false;

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(CatchMotion.authOtpResendCooldown, (_) {
      if (mounted) setState(() {});
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final hold = widget.hold;
    final remaining = hold.expiresAt.difference(DateTime.now());
    final minutes = remaining.inMinutes.clamp(0, 999);
    final isRequester = hold.requesterUid == widget.currentUid;
    final active = hold.status.isActive && remaining > Duration.zero;
    return CatchSurface.card(
      padding: CatchInsets.content,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CatchText(
            active
                ? context.l10n.crossPathsPairInventoryStatusHeldNotBooked
                : context.l10n.crossPathsPairInventoryStatusNoLongerHeld,
            variant: CatchTextVariant.sectionTitle,
          ),
          gapH8,
          CatchText(
            active
                ? context.l10n.crossPathsPairInventoryHoldCountdown(
                    minutes: minutes,
                  )
                : context.l10n.crossPathsPairInventoryHoldEndedBody,
            variant: CatchTextVariant.supporting,
            color: t.ink2,
          ),
          gapH8,
          CatchText(
            context.l10n.crossPathsPairInventoryBookingStates(
              requesterStatus: _bookingStatusLabel(
                context,
                hold.requesterBookingStatus,
              ),
              attendeeStatus: _bookingStatusLabel(
                context,
                hold.attendeeBookingStatus,
              ),
            ),
            variant: CatchTextVariant.supporting,
            color: t.ink2,
          ),
          if (active && isRequester) ...[
            gapH12,
            CatchButton(
              key: const ValueKey('cross-paths-pair-complete-booking'),
              label: context.l10n.crossPathsPairInventoryActionCompleteBooking,
              fullWidth: true,
              status: (_booking)
                  ? CatchButtonStatus.loading
                  : CatchButtonStatus.idle,
              onPressed: _booking ? null : _completeBooking,
            ),
          ] else if (active) ...[
            gapH8,
            CatchText(
              context.l10n.crossPathsPairInventoryWaitingForRequester,
              variant: CatchTextVariant.supporting,
              color: t.ink2,
            ),
          ] else ...[
            gapH12,
            CatchButton(
              label: context.l10n.crossPathsExploreCardActionSeeEvent,
              fullWidth: true,
              variant: CatchButtonVariant.secondary,
              onPressed: () => context.pushNamed(
                Routes.eventDetailScreen.name,
                pathParameters: {
                  'clubId': widget.event.clubId,
                  'eventId': widget.event.id,
                },
                extra: widget.event,
              ),
            ),
          ],
        ],
      ),
    );
  }

  String _bookingStatusLabel(BuildContext context, String status) {
    return switch (status.trim().toLowerCase()) {
      'held' => context.l10n.crossPathsPairInventoryBookingStatusHeld,
      'confirmed' ||
      'signedup' => context.l10n.crossPathsPairInventoryBookingStatusConfirmed,
      _ => context.l10n.crossPathsPairInventoryBookingStatusNotBooked,
    };
  }

  Future<void> _completeBooking() async {
    final profile = ref.read(watchUserProfileProvider).asData?.value;
    if (profile == null) return;
    setState(() => _booking = true);
    try {
      await ref
          .read(crossPathsInvitationControllerProvider.notifier)
          .completePairBooking(
            hold: widget.hold,
            event: widget.event,
            user: profile,
          );
      if (mounted) {
        showCatchNotice(
          context,
          context.l10n.crossPathsPairInventoryBookingStarted,
        );
      }
    } catch (error) {
      if (mounted) {
        showCatchNoticeError(
          context,
          error,
          errorContext: AppErrorContext.explore,
        );
      }
    } finally {
      if (mounted) setState(() => _booking = false);
    }
  }
}
