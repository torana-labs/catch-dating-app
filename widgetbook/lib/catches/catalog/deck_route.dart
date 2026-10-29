import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/bookings/data/event_participation_repository.dart';
import 'package:catch_dating_app/contexts/bookings/domain/event_participation.dart';
import 'package:catch_dating_app/contexts/connections/data/swipe_repository.dart';
import 'package:catch_dating_app/contexts/connections/domain/swipe.dart';
import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/profiles/data/user_profile_repository.dart';
import 'package:catch_dating_app/contexts/profiles/domain/public_profile.dart';
import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:catch_dating_app/design_fixtures/catches_surface_fixtures.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:catch_dating_app/swipes/presentation/swipe_queue_controller.dart';
import 'package:catch_dating_app/swipes/presentation/swipe_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../support/contract_preview.dart';
import '../../support/page_preview.dart';
import '../../support/widgetbook_harness.dart';
import 'fixtures.dart';
import 'preview.dart';

@widgetbook.UseCase(
  name: 'Event deck route states',
  type: SwipeScreen,
  path: '[P1 product surfaces]/Catches',
)
Widget catchesEventDeckRouteStates(BuildContext context) {
  final openEvent = CatchesSurfaceFixtures.openWindowEvent();
  final upcomingEvent = CatchesSurfaceFixtures.upcomingEvent();
  final closedEvent = CatchesSurfaceFixtures.closedWindowEvent();

  return WidgetbookPageCatalogFrame(
    title: 'SwipeScreen',
    contractId: 'screen.catches.event',
    children: [
      WidgetbookPageStateCard(
        label: 'queue loading',
        child: WidgetbookCatchesDeviceFrame(
          child: _DeckRouteScope(event: openEvent, queue: _neverQueue),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'queue error',
        child: WidgetbookCatchesDeviceFrame(
          child: _DeckRouteScope(
            event: openEvent,
            queue: () => Future<List<PublicProfile>>.error(
              StateError('Queue failed'),
              StackTrace.empty,
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'offline queue error',
        child: WidgetbookCatchesDeviceFrame(
          child: _DeckRouteScope(
            event: openEvent,
            queue: () => Future<List<PublicProfile>>.error(
              widgetbookCatchesOfflineException(
                action: 'load swipe candidates',
              ),
              StackTrace.empty,
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'profile deck with reactions',
        child: WidgetbookCatchesDeviceFrame(
          child: _DeckRouteScope(event: openEvent),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'vibe-prioritized deck',
        child: WidgetbookCatchesDeviceFrame(
          child: _DeckRouteScope(
            event: openEvent,
            vibeIds: const {CatchesSurfaceFixtures.secondCandidateUid},
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'empty queue',
        child: WidgetbookCatchesDeviceFrame(
          child: _DeckRouteScope(
            event: openEvent,
            queue: () async => const <PublicProfile>[],
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'event missing',
        child: WidgetbookCatchesDeviceFrame(
          child: _DeckRouteScope(
            event: openEvent,
            eventStream: Stream<Event?>.value(null),
            queue: () async => const <PublicProfile>[],
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'signed out',
        child: WidgetbookCatchesDeviceFrame(
          child: _DeckRouteScope(
            event: openEvent,
            uid: null,
            profileStream: Stream<UserProfile?>.value(null),
            queue: () async => const <PublicProfile>[],
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'event in progress',
        child: WidgetbookCatchesDeviceFrame(
          child: _DeckRouteScope(
            event: upcomingEvent,
            participation: CatchesSurfaceFixtures.attendedParticipation(
              event: upcomingEvent,
            ),
            queue: () async => const <PublicProfile>[],
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'did not attend',
        child: WidgetbookCatchesDeviceFrame(
          child: _DeckRouteScope(
            event: openEvent,
            participation: CatchesSurfaceFixtures.signedUpParticipation(
              event: openEvent,
            ),
            queue: () async => const <PublicProfile>[],
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'catch window closed',
        child: WidgetbookCatchesDeviceFrame(
          child: _DeckRouteScope(
            event: closedEvent,
            participation: CatchesSurfaceFixtures.attendedParticipation(
              event: closedEvent,
            ),
            queue: () async => const <PublicProfile>[],
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'mutation failure on interaction',
        child: WidgetbookCatchesDeviceFrame(
          child: _DeckRouteScope(
            event: openEvent,
            swipeRepository: const _ThrowingSwipeRepository(),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'text scale 2.0',
        child: WidgetbookCatchesDeviceFrame(
          child: WidgetbookMediaOverride(
            textScaler: const TextScaler.linear(2),
            child: _DeckRouteScope(event: openEvent),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'reduced motion',
        child: WidgetbookCatchesDeviceFrame(
          child: WidgetbookMediaOverride(
            disableAnimations: true,
            child: _DeckRouteScope(event: openEvent),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'pass pending',
        child: WidgetbookCatchesDeviceFrame(
          child: CatchesProfileBody(
            profile: CatchesSurfaceFixtures.candidates.first,
            remainingCount: CatchesSurfaceFixtures.candidates.length,
            viewerProfile: CatchesSurfaceFixtures.viewer,
            sharedRunTitle: CatchesSurfaceFixtures.openWindowEvent().title,
            actionState: const CatchesProfileReviewActionState.passPending(),
            onBack: widgetbookNoop,
            onFilters: widgetbookNoop,
            onPass: widgetbookNoop,
            onReact: widgetbookCatchesNoopReaction,
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'reaction pending',
        child: WidgetbookCatchesDeviceFrame(
          child: CatchesProfileBody(
            profile: CatchesSurfaceFixtures.candidates.first,
            remainingCount: CatchesSurfaceFixtures.candidates.length,
            viewerProfile: CatchesSurfaceFixtures.viewer,
            sharedRunTitle: CatchesSurfaceFixtures.openWindowEvent().title,
            actionState:
                const CatchesProfileReviewActionState.reactionPending(),
            onBack: widgetbookNoop,
            onFilters: widgetbookNoop,
            onPass: widgetbookNoop,
            onReact: widgetbookCatchesNoopReaction,
          ),
        ),
      ),
    ],
  );
}

class _DeckRouteScope extends StatelessWidget {
  const _DeckRouteScope({
    required this.event,
    this.uid = CatchesSurfaceFixtures.viewerUid,
    this.eventStream,
    this.profileStream,
    this.participation,
    this.queue,
    this.vibeIds = const {},
    this.swipeRepository = const _NoopSwipeRepository(),
  });

  final Event event;
  final String? uid;
  final Stream<Event?>? eventStream;
  final Stream<UserProfile?>? profileStream;
  final EventParticipation? participation;
  final Future<List<PublicProfile>> Function()? queue;
  final Set<String> vibeIds;
  final SwipeRepository swipeRepository;

  @override
  Widget build(BuildContext context) {
    final viewerParticipation =
        participation ??
        CatchesSurfaceFixtures.attendedParticipation(event: event);

    return WidgetbookFixtureScope(
      overrides: [
        uidProvider.overrideWithValue(AsyncData<String?>(uid)),
        watchUserProfileProvider.overrideWith(
          (ref) =>
              profileStream ??
              Stream<UserProfile?>.value(
                uid == null ? null : CatchesSurfaceFixtures.viewer,
              ),
        ),
        watchEventProvider(
          event.id,
        ).overrideWith((ref) => eventStream ?? Stream<Event?>.value(event)),
        watchEventParticipationProvider(
          event.id,
          CatchesSurfaceFixtures.viewerUid,
        ).overrideWith(
          (ref) => Stream<EventParticipation?>.value(viewerParticipation),
        ),
        swipeQueueProvider(event.id, vibeIds: vibeIds).overrideWithBuild((
          ref,
          notifier,
        ) async {
          if (queue != null) return queue!();
          final candidates = CatchesSurfaceFixtures.candidates;
          if (vibeIds.isEmpty) return candidates;
          return [
            ...candidates.where((profile) => vibeIds.contains(profile.uid)),
            ...candidates.where((profile) => !vibeIds.contains(profile.uid)),
          ];
        }),
        swipeRepositoryProvider.overrideWithValue(swipeRepository),
      ],
      child: SwipeScreen(
        eventId: event.id,
        vibeIds: vibeIds,
        now: CatchesSurfaceFixtures.now,
      ),
    );
  }
}

Future<List<PublicProfile>> _neverQueue() =>
    Completer<List<PublicProfile>>().future;

class _NoopSwipeRepository implements SwipeRepository {
  const _NoopSwipeRepository();

  @override
  Future<Set<String>> fetchSwipedUserIds({required String uid}) async =>
      const <String>{};

  @override
  Future<void> recordSwipe({required Swipe swipe}) async {}
}

class _ThrowingSwipeRepository implements SwipeRepository {
  const _ThrowingSwipeRepository();

  @override
  Future<Set<String>> fetchSwipedUserIds({required String uid}) async =>
      const <String>{};

  @override
  Future<void> recordSwipe({required Swipe swipe}) async {
    throw const BackendOperationException(
      code: 'design-swipe-write-failed',
      message: 'Unable to save that catch. Please try again.',
      context: BackendErrorContext(
        service: BackendService.firestore,
        action: 'record swipe',
        resource: 'profile_decisions',
      ),
      retryable: true,
    );
  }
}
