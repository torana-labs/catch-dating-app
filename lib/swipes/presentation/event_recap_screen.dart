import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/bookings/data/event_participation_repository.dart';
import 'package:catch_dating_app/contexts/connections/data/swipe_candidate_repository.dart';
import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/live/data/event_success_repository.dart';
import 'package:catch_dating_app/contexts/messaging/data/event_chat_repository.dart';
import 'package:catch_dating_app/contexts/organizers/data/organizer_membership_repository.dart';
import 'package:catch_dating_app/contexts/organizers/data/organizers_repository.dart';
import 'package:catch_dating_app/contexts/profiles/data/public_profiles_lookup.dart';
import 'package:catch_dating_app/contexts/profiles/data/user_profile_repository.dart';
import 'package:catch_dating_app/contexts/profiles/domain/public_profile.dart';
import 'package:catch_dating_app/organizers/presentation/detail/organizer_membership_controller.dart';
import 'package:catch_dating_app/reviews/shared/star_rating_row.dart';
import 'package:catch_dating_app/routing/go_router.dart';
import 'package:catch_dating_app/swipes/presentation/event_recap_controller.dart';
import 'package:catch_dating_app/swipes/presentation/event_recap_screen_state.dart';
import 'package:catch_dating_app/swipes/presentation/event_recap_view_model.dart';
import 'package:catch_dating_app/swipes/presentation/swipe_keys.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/catch_async_state.dart';
import 'package:catch_platform/errors/app_error_message.dart';
import 'package:catch_platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_platform/riverpod_ui/catch_localized_error_state.dart';
import 'package:catch_platform/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

/// After the event (RbAppAfter, RbAppDinnerAfter): how it went, the group
/// chat, the people you'd like to see again and the organiser's next event.
class EventRecapScreen extends ConsumerStatefulWidget {
  const EventRecapScreen({super.key, required this.eventId, this.now});

  final String eventId;

  /// Fixes the clock for captures and tests.
  final DateTime? now;

  @override
  ConsumerState<EventRecapScreen> createState() => _EventRecapScreenState();
}

class _EventRecapScreenState extends ConsumerState<EventRecapScreen> {
  final Set<String> _picked = <String>{};
  final Set<String> _pending = <String>{};
  int? _pendingRating;

  DateTime get _now => widget.now ?? DateTime.now();

  @override
  Widget build(BuildContext context) {
    final eventId = widget.eventId;
    final viewModelState = catchAsyncStateFromAsyncValue(
      ref.watch(eventRecapViewModelProvider(eventId)),
    );
    final viewModel = viewModelState.value;
    final event = viewModel?.event;
    final user = catchAsyncStateFromAsyncValue(
      ref.watch(watchUserProfileProvider),
    ).value;
    final uid = user?.uid;
    final state = buildEventRecapScreenState(
      eventId: eventId,
      l10n: context.l10n,
      now: _now,
      inputs: EventRecapInputs(
        viewModel: viewModelState,
        rosterProfiles: _watchRosterProfiles(viewModel),
        organizerName: event == null
            ? null
            : _value(
                ref.watch(watchOrganizerProvider(event.organizerId)),
              )?.name,
        currentUser: user,
        participation: uid == null
            ? null
            : _value(ref.watch(watchEventParticipationProvider(eventId, uid))),
        feedback: uid == null
            ? null
            : _value(
                ref.watch(
                  watchUserEventSuccessFeedbackProvider(
                    eventId: eventId,
                    uid: uid,
                  ),
                ),
              ),
        assignment: uid == null
            ? null
            : _value(
                ref.watch(
                  watchUserEventSuccessAssignmentProvider(
                    eventId: eventId,
                    uid: uid,
                  ),
                ),
              ),
        chatAccess: uid == null
            ? null
            : _value(ref.watch(eventChatAccessProvider(eventId))),
        organizerEvents: event == null
            ? const <Event>[]
            : _value(
                    ref.watch(
                      watchActiveEventsForOrganizerProvider(
                        ActiveOrganizerEventsQuery(
                          organizerId: event.organizerId,
                          day: _now,
                        ),
                      ),
                    ),
                  ) ??
                  const <Event>[],
        pickedIds: _picked,
        pendingRating: _pendingRating,
        followedOrganizerIds: _value(
          ref.watch(currentUserFollowedOrganizerIdsProvider),
        ),
      ),
    );

    return CatchRoot(
      format: state is EventRecapReady ? state.format : null,
      child: CatchScreen(
        key: const ValueKey<String>('after-event-screen'),
        topBar: CatchTopBar(
          variant: CatchTopBarVariant.moment,
          back: CatchTopBarBack(
            label: context.l10n.swipesEventRecapScreenTooltipCloseRecap,
            close: true,
            onPressed: _close,
          ),
        ),
        body: switch (state) {
          EventRecapLoading() => const CatchPageBody.screen(
            child: CatchLoadingIndicator(),
          ),
          EventRecapError(:final error, :final retryIntent) =>
            CatchLocalizedErrorState(
              error,
              context: AppErrorContext.event,
              onRetry: () => _retry(retryIntent),
            ),
          EventRecapMissingEvent() => CatchErrorState(
            title: context.l10n.swipesEventRecapScreenTitleEventNotFound,
            message: context.l10n.swipesEventRecapScreenMessageThisEventIsNo,
            actions: const [CatchErrorBackButton()],
          ),
          EventRecapReady ready => EventRecapReadyBody(
            state: ready,
            pendingPicks: _pending,
            onRate: event == null
                ? null
                : (rating) => _rate(event, ready, rating),
            onOpenChat: () => context.pushNamed(
              Routes.eventChatScreen.name,
              pathParameters: {'eventId': eventId},
            ),
            onFilters: () => context.pushNamed(Routes.filtersScreen.name),
            onPick: _pick,
            onRetryPeople: () => _retryRosterProfiles(ready.people.attendeeIds),
            onFinishProfile: () => context.push(
              profileCompletionLocation(
                from: Routes.eventRecapScreen.path.replaceFirst(
                  ':eventId',
                  eventId,
                ),
              ),
            ),
            onOpenNext: (next) => context.pushNamed(
              Routes.eventDetailScreen.name,
              pathParameters: {
                'organizerId': next.organizerId,
                'eventId': next.eventId,
              },
              extra: next.event,
            ),
            followPending: ref
                .watch(
                  OrganizerMembershipController.joinMutation(state.organizerId),
                )
                .isPending,
            onFollow: () => _follow(ready.organizerId),
            onOpenOrganizer: () => context.pushNamed(
              Routes.organizerDetailScreen.name,
              pathParameters: {'organizerId': ready.organizerId},
            ),
          ),
        },
      ),
    );
  }

  CatchAsyncState<Map<String, PublicProfile>> _watchRosterProfiles(
    EventRecapViewModel? viewModel,
  ) {
    final attendeeIds = viewModel?.attendeeIds ?? const <String>[];
    if (attendeeIds.isEmpty) {
      return const CatchAsyncState.data(<String, PublicProfile>{});
    }
    // One batched fetch for every row instead of a stream per person.
    return catchAsyncStateFromAsyncValue(
      ref.watch(publicProfilesByIdsProvider(PublicProfilesQuery(attendeeIds))),
    );
  }

  void _close() {
    if (context.canPop()) {
      context.pop();
    } else {
      context.goNamed(Routes.dashboardScreen.name);
    }
  }

  void _retry(EventRecapRetryIntent intent) {
    ref.invalidate(watchEventProvider(intent.eventId));
    ref.invalidate(swipeCandidatesProvider(intent.eventId));
    ref.invalidate(uidProvider);
    ref.invalidate(eventRecapViewModelProvider(intent.eventId));
  }

  void _retryRosterProfiles(Iterable<String> attendeeIds) {
    ref.invalidate(
      publicProfilesByIdsProvider(PublicProfilesQuery(attendeeIds)),
    );
  }

  void _pick(String attendeeId) {
    if (_picked.contains(attendeeId) || _pending.contains(attendeeId)) return;
    setState(() => _pending.add(attendeeId));
    unawaited(
      EventRecapController.pickMutation
          .run(ref, (tx) async {
            await tx
                .get(eventRecapControllerProvider.notifier)
                .pick(eventId: widget.eventId, targetId: attendeeId);
          })
          .then(
            (_) {
              if (!mounted) return;
              setState(() {
                _pending.remove(attendeeId);
                _picked.add(attendeeId);
              });
            },
            onError: (Object error) {
              if (!mounted) return;
              setState(() => _pending.remove(attendeeId));
              showCatchNoticeError(
                context,
                error,
                errorContext: AppErrorContext.swipes,
                onRetry: () => _pick(attendeeId),
              );
            },
          ),
    );
  }

  void _follow(String organizerId) {
    unawaited(
      OrganizerMembershipController.joinMutation(organizerId)
          .run(ref, (tx) async {
            await tx
                .get(organizerMembershipControllerProvider.notifier)
                .join(organizerId);
          })
          .then(
            (_) {},
            onError: (Object error) {
              if (!mounted) return;
              showCatchNoticeError(
                context,
                error,
                errorContext: AppErrorContext.organizer,
                onRetry: () => _follow(organizerId),
              );
            },
          ),
    );
  }

  void _rate(Event event, EventRecapReady state, int rating) {
    setState(() => _pendingRating = rating);
    unawaited(
      EventRecapController.rateMutation
          .run(ref, (tx) async {
            await tx
                .get(eventRecapControllerProvider.notifier)
                .rate(
                  event: event,
                  rating: rating,
                  pickedCount: _picked.length,
                  existing: state.rating.existingFeedback,
                );
          })
          .then(
            (_) {},
            onError: (Object error) {
              if (!mounted) return;
              setState(() => _pendingRating = null);
              showCatchNoticeError(
                context,
                error,
                errorContext: AppErrorContext.event,
                onRetry: () => _rate(event, state, rating),
              );
            },
          ),
    );
  }
}

T? _value<T extends Object>(AsyncValue<T?> value) =>
    catchAsyncStateFromAsyncValue(value).value;

/// The ready screen, provider-free so captures and tests can pump it.
class EventRecapReadyBody extends StatelessWidget {
  const EventRecapReadyBody({
    super.key,
    required this.state,
    required this.onRate,
    required this.onOpenChat,
    required this.onFilters,
    required this.onPick,
    required this.onRetryPeople,
    required this.onFinishProfile,
    required this.onOpenNext,
    required this.onFollow,
    required this.onOpenOrganizer,
    this.pendingPicks = const <String>{},
    this.followPending = false,
  });

  final EventRecapReady state;
  final Set<String> pendingPicks;
  final ValueChanged<int>? onRate;
  final VoidCallback onOpenChat;
  final VoidCallback onFilters;
  final ValueChanged<String> onPick;
  final VoidCallback onRetryPeople;
  final VoidCallback onFinishProfile;
  final ValueChanged<EventRecapNextState> onOpenNext;
  final VoidCallback onFollow;
  final VoidCallback onOpenOrganizer;
  final bool followPending;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final rating = state.rating;
    final chat = state.chat;
    final people = state.people;
    final next = state.next;
    final organizerName = state.organizerName;
    return CatchPageBody.screen(
      children: [
        CatchStack(
          gap: CatchStackGap.g4,
          children: [
            CatchText(
              state.kicker,
              variant: CatchTextVariant.labelKicker,
              tone: CatchTextTone.secondary,
            ),
            CatchText(
              l10n.afterEventTitle,
              variant: CatchTextVariant.pageTitle,
            ),
          ],
        ),
        CatchStack(
          gap: CatchStackGap.g4,
          children: [
            Semantics(
              label: l10n.afterEventRatingLabel,
              child: StarRatingPicker(
                rating: rating.rating,
                enabled: rating.enabled && onRate != null,
                onChanged: (value) => onRate?.call(value),
                keyBuilder: SwipeKeys.afterEventRatingStar,
                alignment: MainAxisAlignment.start,
              ),
            ),
            CatchText(
              rating.privacyNote,
              variant: CatchTextVariant.bodySmall,
              tone: CatchTextTone.secondary,
            ),
          ],
        ),
        if (chat != null)
          CatchSection(
            title: l10n.afterEventChatTitle,
            dividers: CatchSectionPlacement.none,
            children: [
              CatchIndexRow(
                key: SwipeKeys.afterEventGroupChat,
                leading: CatchAvatar.system(
                  size: CatchAvatarSize.sm,
                  name: chat.title,
                ),
                title: chat.title,
                subtitle: chat.subtitle,
                chevron: true,
                onTap: onOpenChat,
              ),
            ],
          ),
        CatchSection(
          title: l10n.afterEventStayInTouchTitle,
          action: CatchSectionAction(
            label: l10n.afterEventFilters,
            onPressed: onFilters,
          ),
          dividers: CatchSectionPlacement.none,
          children: [
            CatchStack(
              gap: CatchStackGap.g4,
              children: [
                CatchText(
                  l10n.afterEventStayInTouchBody,
                  tone: CatchTextTone.secondary,
                ),
                CatchText(
                  [?people.countNote, people.windowNote].join(' · '),
                  variant: CatchTextVariant.labelKicker,
                  tone: CatchTextTone.secondary,
                ),
              ],
            ),
          ],
        ),
        _PeopleList(
          people: people,
          pendingPicks: pendingPicks,
          onPick: onPick,
          onRetry: onRetryPeople,
          onFinishProfile: onFinishProfile,
        ),
        if (next != null)
          CatchSurface(
            key: SwipeKeys.afterEventNext,
            block: CatchSurfaceBlock.spotlight,
            color: _surfaceColor(state.format),
            child: CatchStack(
              children: [
                CatchText(next.kicker, variant: CatchTextVariant.labelKicker),
                CatchText(next.title, variant: CatchTextVariant.displaySection),
                CatchButton(
                  label: l10n.afterEventBookNext,
                  onPressed: () => onOpenNext(next),
                  fullWidth: true,
                ),
              ],
            ),
          ),
        if (organizerName != null && state.following == false)
          CatchButton(
            key: SwipeKeys.afterEventFollowOrganizer,
            label: l10n.afterEventFollowOrganizer(organizer: organizerName),
            variant: CatchButtonVariant.secondary,
            onPressed: followPending ? null : onFollow,
            fullWidth: true,
          )
        else if (next == null)
          CatchButton(
            key: SwipeKeys.afterEventOrganizer,
            label: l10n.afterEventSeeOrganizer,
            variant: CatchButtonVariant.secondary,
            onPressed: onOpenOrganizer,
            fullWidth: true,
          ),
      ],
    );
  }
}

class _PeopleList extends StatelessWidget {
  const _PeopleList({
    required this.people,
    required this.pendingPicks,
    required this.onPick,
    required this.onRetry,
    required this.onFinishProfile,
  });

  final EventRecapPeopleState people;
  final Set<String> pendingPicks;
  final ValueChanged<String> onPick;
  final VoidCallback onRetry;
  final VoidCallback onFinishProfile;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    if (people.needsProfile) {
      return CatchEmptyState(
        key: SwipeKeys.afterEventFinishProfile,
        icon: CatchIcons.person,
        title: l10n.afterEventNeedsProfileTitle,
        message: l10n.afterEventNeedsProfileBody,
        actions: [
          CatchButton(
            label: l10n.afterEventNeedsProfileAction,
            variant: CatchButtonVariant.secondary,
            onPressed: onFinishProfile,
          ),
        ],
      );
    }
    final empty = people.empty;
    if (empty != null) {
      return CatchEmptyState(
        icon: empty.icon,
        title: empty.title,
        message: empty.message,
      );
    }
    return switch (people.status) {
      EventRecapProfileLookupStatus.loading => const CatchLoadingIndicator(),
      EventRecapProfileLookupStatus.error => CatchLocalizedErrorState(
        people.error!,
        context: AppErrorContext.profile,
        onRetry: onRetry,
        mode: CatchErrorStateMode.inline,
      ),
      EventRecapProfileLookupStatus.ready => CatchSection(
        children: [
          for (final row in people.rows)
            CatchIndexRow(
              key: SwipeKeys.afterEventPerson(row.attendeeId),
              leading: CatchAvatar.system(
                size: CatchAvatarSize.sm,
                name: row.name,
                imageUrl: row.photoUrl,
              ),
              title: row.name,
              subtitle: row.subtitle,
              body: row.body,
              onTap: null,
              action: CatchIndexRowAction(
                label: row.picked ? l10n.afterEventPicked : l10n.afterEventPick,
                variant: row.picked
                    ? CatchIndexRowActionVariant.primary
                    : CatchIndexRowActionVariant.secondary,
                onPressed:
                    row.picked ||
                        !people.canPick ||
                        pendingPicks.contains(row.attendeeId)
                    ? null
                    : () => onPick(row.attendeeId),
              ),
            ),
        ],
      ),
    };
  }
}

CatchSurfaceColor _surfaceColor(CatchFormat format) => switch (format) {
  CatchFormat.run => CatchSurfaceColor.run,
  CatchFormat.dinner => CatchSurfaceColor.dinner,
  CatchFormat.games => CatchSurfaceColor.games,
  CatchFormat.courts => CatchSurfaceColor.courts,
  CatchFormat.nightsOut => CatchSurfaceColor.nightsOut,
};
