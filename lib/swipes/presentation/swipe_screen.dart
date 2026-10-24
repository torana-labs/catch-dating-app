import 'dart:async';

import 'package:catch_dating_app/core/app_error_message.dart';
import 'package:catch_dating_app/core/presentation/catch_async_state.dart';
import 'package:catch_dating_app/core/responsive/component_breakpoints.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_localized_error_state.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_dating_app/events/data/event_participation_repository.dart';
import 'package:catch_dating_app/events/data/event_repository.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/public_profile/domain/public_profile.dart';
import 'package:catch_dating_app/routing/go_router.dart';
import 'package:catch_dating_app/swipes/domain/swipe.dart';
import 'package:catch_dating_app/swipes/presentation/catches_event_screen_state.dart';
import 'package:catch_dating_app/swipes/presentation/swipe_queue_controller.dart';
import 'package:catch_dating_app/swipes/presentation/widgets/catches_pass_button.dart';
import 'package:catch_dating_app/swipes/presentation/widgets/swipe_empty_state.dart';
import 'package:catch_dating_app/swipes/shared/profile_surface/profile_reaction_action.dart';
import 'package:catch_dating_app/swipes/shared/profile_surface/profile_surface.dart';
import 'package:catch_dating_app/user_profile/data/user_profile_repository.dart';
import 'package:catch_dating_app/user_profile/domain/user_profile.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

class SwipeScreen extends ConsumerStatefulWidget {
  const SwipeScreen({
    super.key,
    required this.eventId,
    this.vibeIds = const {},
    this.now,
  });

  final String eventId;
  final Set<String> vibeIds;
  final DateTime? now;

  @override
  ConsumerState<SwipeScreen> createState() => _SwipeScreenState();
}

class _SwipeScreenState extends ConsumerState<SwipeScreen> {
  CatchesProfileReviewActionState _actionState =
      const CatchesProfileReviewActionState.idle();

  Future<void> _recordSwipe(
    SwipeDirection direction, {
    ProfileReactionTarget? reactionTarget,
    String? comment,
  }) async {
    if (_actionState.isPending) return;

    final nextActionState = direction == SwipeDirection.pass
        ? const CatchesProfileReviewActionState.passPending()
        : const CatchesProfileReviewActionState.reactionPending();

    Future<void> performSwipe() => ref
        .read(
          swipeQueueProvider(widget.eventId, vibeIds: widget.vibeIds).notifier,
        )
        .swipe(direction, reactionTarget: reactionTarget, comment: comment);

    setState(() => _actionState = nextActionState);
    try {
      await performSwipe();
    } catch (error) {
      // The deck only advances after the write succeeds, so on failure we keep
      // the current profile and surface the error instead of silently stalling.
      if (mounted) {
        showCatchNoticeError(
          context,
          error,
          errorContext: AppErrorContext.swipes,
          onRetry: () {
            unawaited(
              _recordSwipe(
                direction,
                reactionTarget: reactionTarget,
                comment: comment,
              ),
            );
          },
        );
      }
    } finally {
      if (mounted) {
        setState(
          () => _actionState = const CatchesProfileReviewActionState.idle(),
        );
      } else {
        _actionState = const CatchesProfileReviewActionState.idle();
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final queueAsync = ref.watch(
      swipeQueueProvider(widget.eventId, vibeIds: widget.vibeIds),
    );
    final eventAsync = ref.watch(watchEventProvider(widget.eventId));
    final currentUserAsync = ref.watch(watchUserProfileProvider);
    final currentUserState = _catchAsyncState(currentUserAsync);
    final currentUser = currentUserState.value;
    final participationAsync = currentUser == null
        ? null
        : ref.watch(
            watchEventParticipationProvider(widget.eventId, currentUser.uid),
          );
    final state = buildCatchesEventScreenState(
      l10n: context.l10n,
      queue: _catchAsyncState(queueAsync),
      event: _catchAsyncState(eventAsync),
      currentUser: currentUserState,
      currentUserParticipation: participationAsync == null
          ? null
          : _catchAsyncState(participationAsync),
      now: widget.now,
    );

    return CatchScaffold.workspace(
      backgroundColor: t.bg,
      body: switch (state) {
        CatchesEventQueueLoading() => const CatchesProfileBodySkeleton(),
        CatchesEventQueueError(:final error) => CatchLocalizedErrorState(
          error,
          context: AppErrorContext.swipes,
          onRetry: () => ref.invalidate(
            swipeQueueProvider(widget.eventId, vibeIds: widget.vibeIds),
          ),
        ),
        CatchesEventEmpty(:final content) => SwipeEmptyState(content: content),
        CatchesEventReady(
          :final profile,
          :final remainingCount,
          :final viewerProfile,
          :final sharedRunTitle,
        ) =>
          CatchesProfileBody(
            profile: profile,
            remainingCount: remainingCount,
            viewerProfile: viewerProfile,
            sharedRunTitle: sharedRunTitle,
            actionState: _actionState,
            onBack: () {
              if (context.canPop()) {
                context.pop();
              } else {
                context.goNamed(Routes.swipeHubScreen.name);
              }
            },
            onFilters: () => context.pushNamed(Routes.filtersScreen.name),
            onPass: () => _recordSwipe(SwipeDirection.pass),
            onReact: (target, comment) => _recordSwipe(
              SwipeDirection.like,
              reactionTarget: target,
              comment: comment,
            ),
          ),
      },
    );
  }
}

CatchAsyncState<T> _catchAsyncState<T>(AsyncValue<T> value) {
  return catchAsyncStateFromAsyncValue(value);
}

class CatchesProfileBodySkeleton extends StatelessWidget {
  const CatchesProfileBodySkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return const Stack(
      children: [
        Positioned.fill(
          child: ProfileSurfaceSkeleton(
            bottomPadding: CatchLayout.catchesProfileBottomPadding,
          ),
        ),
        CatchesTopOverlaySkeleton(),
        CatchesScrimOverlay(),
        Positioned(
          left: CatchSpacing.s5,
          bottom: CatchSpacing.s4,
          child: CatchesPassButtonSkeleton(),
        ),
      ],
    );
  }
}

enum CatchesProfileReviewActionStatus { idle, passPending, reactionPending }

@immutable
class CatchesProfileReviewActionState {
  const CatchesProfileReviewActionState.idle()
    : status = CatchesProfileReviewActionStatus.idle;

  const CatchesProfileReviewActionState.passPending()
    : status = CatchesProfileReviewActionStatus.passPending;

  const CatchesProfileReviewActionState.reactionPending()
    : status = CatchesProfileReviewActionStatus.reactionPending;

  final CatchesProfileReviewActionStatus status;

  bool get isPending => status != CatchesProfileReviewActionStatus.idle;
  bool get isPassPending =>
      status == CatchesProfileReviewActionStatus.passPending;
  bool get isReactionPending =>
      status == CatchesProfileReviewActionStatus.reactionPending;
}

class CatchesProfileBody extends StatelessWidget {
  const CatchesProfileBody({
    super.key,
    required this.profile,
    required this.remainingCount,
    required this.onBack,
    required this.onFilters,
    required this.onPass,
    required this.onReact,
    this.viewerProfile,
    this.sharedRunTitle,
    this.actionState = const CatchesProfileReviewActionState.idle(),
  });

  final PublicProfile profile;
  final int remainingCount;
  final VoidCallback onBack;
  final VoidCallback onFilters;
  final VoidCallback onPass;
  final ProfileReactionCallback onReact;
  final UserProfile? viewerProfile;
  final String? sharedRunTitle;
  final CatchesProfileReviewActionState actionState;

  @override
  Widget build(BuildContext context) {
    final actionsEnabled = !actionState.isPending;

    return Stack(
      children: [
        Positioned.fill(
          child: CatchViewport.atWidth(
            breakpoint: ComponentBreakpoints.catchesWidePaddingBreakpoint,
            compactBuilder: (context) => ProfileSurface(
              key: ValueKey(profile.uid),
              profile: profile,
              mode: ProfileSurfaceMode.catches,
              viewerProfile: viewerProfile,
              sharedRunTitle: sharedRunTitle,
              bottomPadding: CatchLayout.catchesProfileBottomPadding,
              onReact: onReact,
              reactionsEnabled: actionsEnabled,
              reactionsPending: actionState.isReactionPending,
            ),
            expandedBuilder: (context) => Padding(
              padding: CatchInsets.catchesWideProfile,
              child: ProfileSurface(
                key: ValueKey(profile.uid),
                profile: profile,
                mode: ProfileSurfaceMode.catches,
                viewerProfile: viewerProfile,
                sharedRunTitle: sharedRunTitle,
                bottomPadding: CatchLayout.catchesProfileBottomPadding,
                onReact: onReact,
                reactionsEnabled: actionsEnabled,
                reactionsPending: actionState.isReactionPending,
              ),
            ),
          ),
        ),
        CatchesTopOverlay(
          remainingCount: remainingCount,
          onBack: onBack,
          onFilters: onFilters,
        ),
        const CatchesScrimOverlay(),
        Positioned(
          left: CatchSpacing.s5,
          bottom: CatchSpacing.s4,
          child: CatchesPassButton(
            onPressed: actionsEnabled ? onPass : null,
            isPending: actionState.isPassPending,
          ),
        ),
      ],
    );
  }
}

class CatchesTopOverlaySkeleton extends StatelessWidget {
  const CatchesTopOverlaySkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);

    return Positioned(
      top: 0,
      left: 0,
      right: 0,
      child: SafeArea(
        bottom: false,
        child: Padding(
          padding: CatchInsets.swipeTopChrome,
          child: Row(
            children: [
              const OverlayIconSkeleton(),
              gapW10,
              Expanded(
                child: Center(
                  child: CatchSkeleton.box(
                    width: CatchLayout.skeletonTextDescriptionWidth,
                    height: CatchSpacing.s9,
                    radius: CatchRadius.pill,
                    borderColor: t.line.withValues(
                      alpha: CatchOpacity.floatingChromeBorder,
                    ),
                  ),
                ),
              ),
              gapW10,
              const OverlayIconSkeleton(),
            ],
          ),
        ),
      ),
    );
  }
}

class OverlayIconSkeleton extends StatelessWidget {
  const OverlayIconSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return CatchSkeleton.circle();
  }
}

class CatchesPassButtonSkeleton extends StatelessWidget {
  const CatchesPassButtonSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return CatchSkeleton.circle(size: CatchLayout.passButtonExtent);
  }
}

class CatchesTopOverlay extends StatelessWidget {
  const CatchesTopOverlay({
    super.key,
    required this.remainingCount,
    required this.onBack,
    required this.onFilters,
  });

  final int remainingCount;
  final VoidCallback onBack;
  final VoidCallback onFilters;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);

    return Positioned(
      top: 0,
      left: 0,
      right: 0,
      child: SafeArea(
        bottom: false,
        child: Padding(
          padding: CatchInsets.swipeTopChrome,
          child: Row(
            children: [
              CatchIconAction(
                tooltip: context.l10n.swipesSwipeScreenTooltipBackToCatches,
                onPressed: onBack,
                size: CatchLayout.floatingControlExtent,
                backgroundColor: t.surface.withValues(
                  alpha: CatchOpacity.floatingControlFill,
                ),
                child: Icon(
                  CatchIcons.arrowBackIosNewRounded,
                  size: CatchIcon.md,
                ),
              ),
              gapW10,
              Expanded(
                child: Center(
                  child: CatchSurface(
                    radius: CatchRadius.pill,
                    backgroundColor: t.surface.withValues(
                      alpha: CatchOpacity.floatingChromeFill,
                    ),
                    borderSpec: CatchBorder.resolve(
                      t,
                      CatchBorderRole.separator,
                      color: t.line.withValues(
                        alpha: CatchOpacity.floatingChromeBorder,
                      ),
                    ),
                    boxShadow: CatchElevation.card,
                    padding: CatchInsets.swipeRemainingCount,
                    child: CatchText(
                      context.l10n
                          .swipesSwipeScreenTextCatchesRemainingcountLeft(
                            remainingCount: remainingCount,
                          ),
                      variant: CatchTextVariant.statusLabel,
                      color: t.ink,
                      maxLines: 1,
                    ),
                  ),
                ),
              ),
              gapW10,
              CatchIconAction(
                tooltip: context.l10n.swipesSwipeScreenTooltipFilters,
                onPressed: onFilters,
                size: CatchLayout.floatingControlExtent,
                backgroundColor: t.surface.withValues(
                  alpha: CatchOpacity.floatingControlFill,
                ),
                child: Icon(CatchIcons.tuneRounded, size: CatchIcon.md),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class CatchesScrimOverlay extends StatelessWidget {
  const CatchesScrimOverlay({super.key});

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);

    return Positioned(
      left: 0,
      right: 0,
      bottom: 0,
      height: CatchLayout.bottomActionScrimHeight,
      child: IgnorePointer(
        child: CatchSurface(
          tone: CatchSurfaceTone.transparent,
          radius: 0,
          padding: EdgeInsets.zero,
          duration: Duration.zero,
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              t.bg.withValues(alpha: CatchOpacity.none),
              t.bg.withValues(alpha: CatchOpacity.bottomActionScrim),
              t.bg,
            ],
          ),
          child: const SizedBox.expand(),
        ),
      ),
    );
  }
}
