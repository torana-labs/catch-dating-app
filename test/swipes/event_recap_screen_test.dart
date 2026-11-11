import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/bookings/data/event_participation_repository.dart';
import 'package:catch_dating_app/contexts/bookings/domain/event_participation.dart';
import 'package:catch_dating_app/contexts/connections/data/swipe_candidate_repository.dart';
import 'package:catch_dating_app/contexts/connections/data/swipe_repository.dart';
import 'package:catch_dating_app/contexts/connections/domain/swipe.dart';
import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/live/data/event_success_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_assignment.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_plan.dart';
import 'package:catch_dating_app/contexts/messaging/data/event_chat_repository.dart';
import 'package:catch_dating_app/contexts/messaging/domain/event_chat.dart';
import 'package:catch_dating_app/contexts/organizers/data/organizer_membership_repository.dart';
import 'package:catch_dating_app/contexts/organizers/data/organizers_repository.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/contexts/profiles/data/public_profiles_lookup.dart';
import 'package:catch_dating_app/contexts/profiles/data/user_profile_repository.dart';
import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:catch_dating_app/swipes/presentation/event_recap_screen.dart';
import 'package:catch_dating_app/swipes/presentation/swipe_keys.dart';
import 'package:catch_platform/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../events/events_test_helpers.dart';
import '../support/profile_readiness_fixtures.dart';
import '../test_pump_helpers.dart';

class _FakeSwipeRepository extends Fake implements SwipeRepository {
  final recorded = <Swipe>[];
  Completer<void>? completer;

  @override
  Future<void> recordSwipe({required Swipe swipe}) async {
    recorded.add(swipe);
    await completer?.future;
  }
}

class _FakeEventSuccessRepository extends Fake
    implements EventSuccessRepository {
  final submitted = <EventSuccessFeedback>[];

  @override
  Future<void> submitFeedback(EventSuccessFeedback feedback) async {
    submitted.add(feedback);
  }
}

const _viewer = 'viewer';

void main() {
  late _FakeSwipeRepository swipes;
  late _FakeEventSuccessRepository feedback;
  late Event event;

  setUp(() {
    swipes = _FakeSwipeRepository();
    feedback = _FakeEventSuccessRepository();
    final endedAt = DateTime.now().subtract(const Duration(hours: 2));
    event = buildEvent(
      id: 'recap-event',
      organizerId: 'org',
      name: 'Tuesday Trivia Night',
      startTime: endedAt.subtract(const Duration(hours: 2)),
      endTime: endedAt,
      checkedInCount: 4,
    );
  });

  Future<void> pump(
    WidgetTester tester, {
    Set<String> followed = const {},
    bool socialReady = true,
  }) async {
    tester.view.physicalSize = const Size(430, 2400);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);
    final organizer = buildOrganizer(id: 'org', name: 'Lantern Lane Social');
    final next = buildEvent(
      id: 'next-event',
      organizerId: 'org',
      name: 'Next Tuesday',
      startTime: DateTime.now().add(const Duration(days: 7)),
      endTime: DateTime.now().add(const Duration(days: 7, hours: 2)),
    );
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          uidProvider.overrideWith((ref) => Stream.value(_viewer)),
          watchUserProfileProvider.overrideWith(
            (ref) => Stream<UserProfile?>.value(
              socialReady
                  ? buildSocialReadyUser(uid: _viewer)
                  : buildUser(uid: _viewer),
            ),
          ),
          watchEventProvider(
            event.id,
          ).overrideWith((ref) => Stream.value(event)),
          swipeCandidatesProvider(event.id).overrideWith(
            (ref) async => [
              buildPublicProfile(uid: 'rhea', name: 'Rhea'),
              buildPublicProfile(uid: 'dev', name: 'Dev'),
            ],
          ),
          publicProfilesByIdsProvider(
            PublicProfilesQuery(['rhea', 'dev']),
          ).overrideWith(
            (ref) async => {
              'rhea': buildPublicProfile(uid: 'rhea', name: 'Rhea'),
              'dev': buildPublicProfile(uid: 'dev', name: 'Dev'),
            },
          ),
          watchOrganizerProvider(
            'org',
          ).overrideWith((ref) => Stream<Organizer?>.value(organizer)),
          watchEventParticipationProvider(event.id, _viewer).overrideWith(
            (ref) => Stream<EventParticipation?>.value(
              buildEventParticipation(
                event: event,
                uid: _viewer,
                status: EventParticipationStatus.attended,
              ),
            ),
          ),
          watchUserEventSuccessFeedbackProvider(
            eventId: event.id,
            uid: _viewer,
          ).overrideWith((ref) => Stream<EventSuccessFeedback?>.value(null)),
          watchUserEventSuccessAssignmentProvider(
            eventId: event.id,
            uid: _viewer,
          ).overrideWith(
            (ref) => Stream<EventSuccessAssignment?>.value(
              EventSuccessAssignment(
                id: 'a',
                eventId: event.id,
                organizerId: 'org',
                uid: _viewer,
                moduleId: 'microPods',
                label: 'Team 4',
                displayTitle: 'Harbour Lights',
                peerUids: const ['dev'],
                source: 'test',
                createdAt: DateTime(2026),
                updatedAt: DateTime(2026),
              ),
            ),
          ),
          eventChatAccessProvider(event.id).overrideWith(
            (ref) async => EventChatAccess(
              eventId: event.id,
              title: 'Tuesday Trivia Night',
              organizerId: 'org',
              roomStatus: 'open',
              roomRevision: 1,
              membershipStatus: 'joined',
              membershipRevision: 1,
              canManage: false,
              canJoin: true,
              canReadMessages: true,
              profileClaimRequired: false,
              termsVersion: 'event-chat-v1',
            ),
          ),
          watchActiveEventsForOrganizerProvider(
            ActiveOrganizerEventsQuery(organizerId: 'org', day: DateTime.now()),
          ).overrideWith((ref) => Stream.value([next])),
          currentUserFollowedOrganizerIdsProvider.overrideWithValue(
            AsyncData(followed),
          ),
          swipeRepositoryProvider.overrideWith((ref) => swipes),
          eventSuccessRepositoryProvider.overrideWith((ref) => feedback),
        ],
        child: MaterialApp(
          theme: AppTheme.light,
          home: EventRecapScreen(eventId: event.id),
        ),
      ),
    );
    await pumpFeatureUi(tester);
  }

  testWidgets('shows the social after-event sections', (tester) async {
    await pump(tester);

    expect(
      find.text('Tuesday Trivia Night · Lantern Lane Social'),
      findsOneWidget,
    );
    expect(find.text('How was it?'), findsOneWidget);
    expect(
      find.text('Only Lantern Lane Social sees this, as part of a summary.'),
      findsOneWidget,
    );
    expect(find.text('Group chat'), findsOneWidget);
    expect(find.byKey(SwipeKeys.afterEventGroupChat), findsOneWidget);
    expect(find.text('Stay in touch'), findsOneWidget);
    expect(find.text('Your team · Harbour Lights'), findsOneWidget);
    expect(find.byKey(SwipeKeys.afterEventNext), findsOneWidget);
    expect(find.text('Next Tuesday'), findsOneWidget);
    expect(find.text('Follow Lantern Lane Social'), findsOneWidget);
  });

  testWidgets('uses no dating language', (tester) async {
    await pump(tester);

    final banned = RegExp(
      r'\b(match\w*|catch(es|ing)?|swip\w*|deck|crush\w*|dat(e|ing)|'
      r'romanc\w*|afterglow|liked you|wingman)\b',
      caseSensitive: false,
    );
    final texts = tester
        .widgetList<Text>(find.byType(Text))
        .map((text) => text.data ?? text.textSpan?.toPlainText() ?? '')
        .where(banned.hasMatch)
        .toList();
    expect(texts, isEmpty);
  });

  testWidgets('a pick records a like and cannot be taken back', (tester) async {
    await pump(tester);

    final rhea = find.byKey(SwipeKeys.afterEventPerson('rhea'));
    await tester.ensureVisible(rhea);
    await tester.tap(find.descendant(of: rhea, matching: find.text('Pick')));
    await pumpFeatureUi(tester);

    expect(swipes.recorded, hasLength(1));
    expect(swipes.recorded.single.targetId, 'rhea');
    expect(swipes.recorded.single.swiperId, _viewer);
    expect(swipes.recorded.single.eventId, event.id);
    expect(swipes.recorded.single.direction, SwipeDirection.like);
    expect(
      find.descendant(of: rhea, matching: find.text('Picked')),
      findsOneWidget,
    );

    await tester.tap(find.descendant(of: rhea, matching: find.text('Picked')));
    await pumpFeatureUi(tester);
    expect(swipes.recorded, hasLength(1));
  });

  testWidgets('the rating saves private feedback for the organiser', (
    tester,
  ) async {
    await pump(tester);

    await tester.tap(find.byKey(SwipeKeys.afterEventRatingStar(4)));
    await pumpFeatureUi(tester);

    expect(feedback.submitted, hasLength(1));
    final saved = feedback.submitted.single;
    expect(saved.eventId, event.id);
    expect(saved.organizerId, 'org');
    expect(saved.uid, _viewer);
    expect(saved.welcomeRating, 4);
  });

  testWidgets('hides Follow once the guest follows the organiser', (
    tester,
  ) async {
    await pump(tester, followed: const {'org'});

    expect(find.byKey(SwipeKeys.afterEventFollowOrganizer), findsNothing);
  });

  testWidgets('asks for a profile before picks, keeping the rest open', (
    tester,
  ) async {
    await pump(tester, socialReady: false);

    expect(find.byKey(SwipeKeys.afterEventFinishProfile), findsOneWidget);
    expect(find.text('Finish your profile'), findsOneWidget);
    expect(find.byKey(SwipeKeys.afterEventPerson('rhea')), findsNothing);
    expect(find.byKey(SwipeKeys.afterEventGroupChat), findsOneWidget);
    expect(find.byKey(SwipeKeys.afterEventRatingStar(1)), findsOneWidget);
  });
}
