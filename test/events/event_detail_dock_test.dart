import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/bookings/domain/event_participation.dart';
import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event_constraints.dart';
import 'package:catch_dating_app/contexts/events/domain/event_policy.dart';
import 'package:catch_dating_app/contexts/events/domain/event_viewer_state.dart';
import 'package:catch_dating_app/contexts/organizers/data/organizers_repository.dart';
import 'package:catch_dating_app/contexts/payments/data/payment_repository.dart';
import 'package:catch_dating_app/events/presentation/widgets/event_detail_dock.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../organizers/organizers_test_helpers.dart'
    show FakeOrganizersRepository;
import 'event_viewer_state_fixtures.dart';
import 'events_test_helpers.dart';

void main() {
  group('EventDetailDock', () {
    testWidgets('books a free event from the eligible state', (tester) async {
      final fakePaymentRepository = FakePaymentRepository();

      await pumpEventsTestApp(
        tester,
        Scaffold(
          bottomNavigationBar: _withCurrentViewer(
            EventDetailDock(
              event: buildEvent(bookedCount: 2),
              clubId: 'club1',
              userProfile: buildUser(),
              participation: null,
            ),
            viewer: viewerFixture(),
          ),
        ),
        overrides: [
          organizersRepositoryProvider.overrideWithValue(
            FakeOrganizersRepository(),
          ),
          paymentRepositoryProvider.overrideWithValue(fakePaymentRepository),
        ],
      );

      final button = tester.widget<CatchButton>(
        find.widgetWithText(CatchButton, 'Join event — 18 spots left'),
      );
      expect(button.accentColor, isNotNull);

      await tester.tap(find.text('Join event — 18 spots left'));
      await tester.pump();

      expect(fakePaymentRepository.bookFreeEventCalled, isTrue);
      expect(fakePaymentRepository.bookedFreeEventId, 'event-1');
    });

    testWidgets('gates run-event booking behind run preferences', (
      tester,
    ) async {
      final fakePaymentRepository = FakePaymentRepository();

      await pumpEventsTestApp(
        tester,
        Scaffold(
          bottomNavigationBar: _withCurrentViewer(
            EventDetailDock(
              event: buildEvent(bookedCount: 2),
              clubId: 'club1',
              userProfile: buildUser(runPreferencesVersion: 0),
              participation: null,
            ),
            viewer: viewerFixture(reason: 'runPreferencesRequired'),
          ),
        ),
        overrides: [
          organizersRepositoryProvider.overrideWithValue(
            FakeOrganizersRepository(),
          ),
          paymentRepositoryProvider.overrideWithValue(fakePaymentRepository),
        ],
      );

      expect(find.text('Set run preferences'), findsOneWidget);
      expect(find.text('Join event — 18 spots left'), findsNothing);
      await tester.tap(find.text('Set run preferences'));
      await tester.pump();

      expect(fakePaymentRepository.bookFreeEventCalled, isFalse);
    });

    testWidgets('passes invite query codes into booking actions', (
      tester,
    ) async {
      final fakePaymentRepository = FakePaymentRepository();
      final event = buildEvent(
        bookedCount: 2,
        eventPolicy: EventPolicyBundle.inviteOnlyEvent(
          capacityLimit: 20,
          basePriceInPaise: 0,
        ),
      );

      await pumpEventsTestApp(
        tester,
        Scaffold(
          bottomNavigationBar: _withCurrentViewer(
            EventDetailDock(
              event: event,
              clubId: 'club1',
              userProfile: buildUser(),
              participation: null,
              inviteCode: 'CATCH-DELHI',
              inviteLinkId: 'invite-link-1',
            ),
            viewer: viewerFixture(),
          ),
        ),
        overrides: [
          organizersRepositoryProvider.overrideWithValue(
            FakeOrganizersRepository(),
          ),
          paymentRepositoryProvider.overrideWithValue(fakePaymentRepository),
        ],
      );

      await tester.tap(find.text('Join event — 18 spots left'));
      await tester.pump();

      expect(fakePaymentRepository.bookedFreeEventInviteCode, 'CATCH-DELHI');
      expect(
        fakePaymentRepository.bookedFreeEventInviteLinkId,
        'invite-link-1',
      );
    });

    testWidgets('keeps invite-only events blocked without an invite code', (
      tester,
    ) async {
      await pumpEventsTestApp(
        tester,
        Scaffold(
          bottomNavigationBar: _withCurrentViewer(
            EventDetailDock(
              event: buildEvent(
                eventPolicy: EventPolicyBundle.inviteOnlyEvent(
                  capacityLimit: 20,
                  basePriceInPaise: 0,
                ),
              ),
              clubId: 'club1',
              userProfile: buildUser(),
              participation: null,
            ),
            viewer: viewerFixture(reason: 'inviteRequired'),
          ),
        ),
        overrides: [
          organizersRepositoryProvider.overrideWithValue(
            FakeOrganizersRepository(),
          ),
          paymentRepositoryProvider.overrideWithValue(FakePaymentRepository()),
        ],
      );

      expect(find.text('Invite required'), findsOneWidget);
    });

    testWidgets('shows booking errors from the active mutation', (
      tester,
    ) async {
      final fakePaymentRepository = FakePaymentRepository()
        ..bookFreeEventError = StateError('booking failed');
      Object? uncaughtError;

      await pumpEventsTestApp(
        tester,
        Scaffold(
          bottomNavigationBar: _withCurrentViewer(
            EventDetailDock(
              event: buildEvent(),
              clubId: 'club1',
              userProfile: buildUser(),
              participation: null,
            ),
            viewer: viewerFixture(),
          ),
        ),
        overrides: [
          organizersRepositoryProvider.overrideWithValue(
            FakeOrganizersRepository(),
          ),
          paymentRepositoryProvider.overrideWithValue(fakePaymentRepository),
        ],
      );

      await runZonedGuarded(
        () async {
          await tester.tap(find.text('Join event — 20 spots left'));
          await tester.pump();
        },
        (error, stackTrace) {
          uncaughtError = error;
        },
      );

      expect(uncaughtError, isA<StateError>());
      await tester.pump();

      expect(
        find.text('Something went wrong. Please try again.'),
        findsOneWidget,
      );
    });

    testWidgets('disables paid bookings when the platform is unsupported', (
      tester,
    ) async {
      await pumpEventsTestApp(
        tester,
        Scaffold(
          bottomNavigationBar: _withCurrentViewer(
            EventDetailDock(
              event: buildEvent(priceInPaise: 15000),
              clubId: 'club1',
              userProfile: buildUser(),
              participation: null,
            ),
            viewer: viewerFixture(price: 15000),
          ),
        ),
        overrides: [
          organizersRepositoryProvider.overrideWithValue(
            FakeOrganizersRepository(),
          ),
          paymentRepositoryProvider.overrideWithValue(
            FakePaymentRepository(supportsPaid: false),
          ),
        ],
      );

      expect(find.text('Paid booking unavailable'), findsOneWidget);
      expect(
        tester.widget<CatchButton>(find.byType(CatchButton)).onPressed,
        isNull,
      );
    });

    testWidgets('cancels an existing booking', (tester) async {
      final fakeEventRepository = FakeEventRepository();

      await pumpEventsTestApp(
        tester,
        Scaffold(
          bottomNavigationBar: _withCurrentViewer(
            EventDetailDock(
              event: buildEvent(bookedCount: 1),
              clubId: 'club1',
              userProfile: buildUser(),
              participation: _participation(),
            ),
            viewer: viewerFixture(admission: 'nativeParticipation'),
          ),
        ),
        overrides: [
          organizersRepositoryProvider.overrideWithValue(
            FakeOrganizersRepository(),
          ),
          eventRepositoryProvider.overrideWith((ref) => fakeEventRepository),
          paymentRepositoryProvider.overrideWithValue(FakePaymentRepository()),
        ],
      );

      await tester.tap(find.text('Cancel booking'));
      await tester.pump();

      expect(fakeEventRepository.cancelledEventId, 'event-1');
    });

    testWidgets('does not use aggregate counts for the current viewer state', (
      tester,
    ) async {
      await pumpEventsTestApp(
        tester,
        Scaffold(
          bottomNavigationBar: _withCurrentViewer(
            EventDetailDock(
              event: buildEvent(bookedCount: 1),
              clubId: 'club1',
              userProfile: buildUser(),
              participation: null,
            ),
            viewer: viewerFixture(),
          ),
        ),
        overrides: [
          organizersRepositoryProvider.overrideWithValue(
            FakeOrganizersRepository(),
          ),
          paymentRepositoryProvider.overrideWithValue(FakePaymentRepository()),
        ],
      );

      expect(find.text('Cancel booking'), findsNothing);
      expect(find.text('Join event — 19 spots left'), findsOneWidget);
    });

    testWidgets(
      'does not render self check-in as an event-detail bottom action',
      (tester) async {
        final startTime = DateTime(2026, 1, 1, 9);

        await pumpEventsTestApp(
          tester,
          Scaffold(
            bottomNavigationBar: _withCurrentViewer(
              EventDetailDock(
                event: buildEvent(startTime: startTime, bookedCount: 1),
                clubId: 'club1',
                now: startTime.subtract(const Duration(minutes: 5)),
                userProfile: buildUser(),
                participation: _participation(),
              ),
              viewer: viewerFixture(admission: 'nativeParticipation'),
            ),
          ),
          overrides: [
            paymentRepositoryProvider.overrideWithValue(
              FakePaymentRepository(),
            ),
          ],
        );

        expect(find.text('Check in'), findsNothing);
        expect(find.text('Cancel booking'), findsNothing);
      },
    );

    testWidgets('joins and leaves the waitlist', (tester) async {
      final fakeEventRepository = FakeEventRepository();
      final container = ProviderContainer(
        overrides: [
          organizersRepositoryProvider.overrideWithValue(
            FakeOrganizersRepository(),
          ),
          eventRepositoryProvider.overrideWith((ref) => fakeEventRepository),
          paymentRepositoryProvider.overrideWithValue(FakePaymentRepository()),
          uidProvider.overrideWith((ref) => Stream.value('runner-9')),
        ],
      );
      addTearDown(container.dispose);
      final uidSubscription = container.listen(
        uidProvider,
        (_, _) {},
        fireImmediately: true,
      );
      addTearDown(uidSubscription.close);
      await container.pump();

      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: container,
          child: MaterialApp(
            theme: AppTheme.light,
            home: Scaffold(
              body: ListView(
                children: [
                  _withCurrentViewer(
                    EventDetailDock(
                      event: buildEvent(
                        capacityLimit: 1,
                        bookedCount: 1,
                        eventPolicy: EventPolicyBundle.openEvent(
                          capacityLimit: 1,
                          basePriceInPaise: 0,
                        ),
                        cohortCounts: const {
                          EventCohortIds.menInterestedInWomen: 1,
                        },
                      ),
                      clubId: 'club1',
                      userProfile: buildUser(uid: 'runner-9'),
                      participation: null,
                    ),
                    viewer: viewerFixture(reason: 'full'),
                  ),
                  _withCurrentViewer(
                    EventDetailDock(
                      event: buildEvent(waitlistedCount: 1),
                      clubId: 'club1',
                      userProfile: buildUser(uid: 'runner-9'),
                      participation: _participation(
                        uid: 'runner-9',
                        status: EventParticipationStatus.waitlisted,
                      ),
                    ),
                    viewer: viewerFixture(reason: 'full', waitlisted: true),
                  ),
                ],
              ),
            ),
          ),
        ),
      );
      await tester.pump();

      await tester.tap(find.text('Join waitlist'));
      await tester.pump();
      await tester.tap(find.text('Leave waitlist'));
      await tester.pump();

      expect(fakeEventRepository.joinedWaitlistEventId, 'event-1');
      expect(fakeEventRepository.leftWaitlistEventId, 'event-1');
    });

    testWidgets('accepts and declines active waitlist offers', (tester) async {
      final fakeEventRepository = FakeEventRepository();
      final container = ProviderContainer(
        overrides: [
          organizersRepositoryProvider.overrideWithValue(
            FakeOrganizersRepository(),
          ),
          eventRepositoryProvider.overrideWith((ref) => fakeEventRepository),
          paymentRepositoryProvider.overrideWithValue(FakePaymentRepository()),
          uidProvider.overrideWith((ref) => Stream.value('runner-9')),
        ],
      );
      addTearDown(container.dispose);
      final uidSubscription = container.listen(
        uidProvider,
        (_, _) {},
        fireImmediately: true,
      );
      addTearDown(uidSubscription.close);
      await container.pump();

      Future<void> pumpOfferCta() async {
        await tester.pumpWidget(
          UncontrolledProviderScope(
            container: container,
            child: MaterialApp(
              theme: AppTheme.light,
              home: Scaffold(
                bottomNavigationBar: _withCurrentViewer(
                  EventDetailDock(
                    event: buildEvent(),
                    clubId: 'club1',
                    now: DateTime(2026, 1, 1, 12),
                    userProfile: buildUser(uid: 'runner-9'),
                    participation: _participation(
                      uid: 'runner-9',
                      status: EventParticipationStatus.waitlisted,
                      waitlistOfferStatus: EventWaitlistOfferStatus.active,
                      waitlistOfferExpiresAt: DateTime(2026, 1, 1, 13),
                      waitlistOfferId: 'event-1_runner-9',
                    ),
                  ),
                  viewer: viewerFixture(
                    route: 'catchWaitlistOffer',
                    waitlisted: true,
                  ),
                ),
              ),
            ),
          ),
        );
        await tester.pump();
      }

      await pumpOfferCta();
      expect(find.text('Accept spot'), findsOneWidget);
      expect(find.text('Decline'), findsOneWidget);
      expect(find.text('Until 1:00 PM'), findsOneWidget);

      await tester.tap(find.text('Decline'));
      await tester.pump();
      expect(fakeEventRepository.declinedWaitlistOfferEventId, 'event-1');

      await pumpOfferCta();
      await tester.tap(find.text('Accept spot'));
      await tester.pump();
      expect(fakeEventRepository.acceptedWaitlistOfferEventId, 'event-1');
    });

    testWidgets('request-only events use request and withdraw copy', (
      tester,
    ) async {
      final fakeEventRepository = FakeEventRepository();
      final fakePaymentRepository = FakePaymentRepository();
      final container = ProviderContainer(
        overrides: [
          eventRepositoryProvider.overrideWith((ref) => fakeEventRepository),
          organizersRepositoryProvider.overrideWithValue(
            FakeOrganizersRepository(),
          ),
          paymentRepositoryProvider.overrideWithValue(fakePaymentRepository),
          uidProvider.overrideWith((ref) => Stream.value('runner-9')),
        ],
      );
      addTearDown(container.dispose);
      final uidSubscription = container.listen(
        uidProvider,
        (_, _) {},
        fireImmediately: true,
      );
      addTearDown(uidSubscription.close);
      await container.pump();

      final event = buildEvent(
        eventPolicy: EventPolicyBundle.requestToJoinEvent(
          capacityLimit: 12,
          basePriceInPaise: 0,
        ),
      );

      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: container,
          child: MaterialApp(
            theme: AppTheme.light,
            home: Scaffold(
              body: ListView(
                children: [
                  _withCurrentViewer(
                    EventDetailDock(
                      event: event,
                      clubId: 'club1',
                      userProfile: buildUser(uid: 'runner-9'),
                      participation: null,
                    ),
                    viewer: viewerFixture(reason: 'reviewRequired'),
                  ),
                  _withCurrentViewer(
                    EventDetailDock(
                      event: event,
                      clubId: 'club1',
                      userProfile: buildUser(uid: 'runner-9'),
                      participation: _participation(
                        uid: 'runner-9',
                        status: EventParticipationStatus.waitlisted,
                      ),
                    ),
                    viewer: viewerFixture(
                      reason: 'reviewRequired',
                      review: 'pending',
                      waitlisted: true,
                    ),
                  ),
                  _withCurrentViewer(
                    EventDetailDock(
                      event: event,
                      clubId: 'club1',
                      userProfile: buildUser(uid: 'runner-9'),
                      participation: _participation(
                        uid: 'runner-9',
                        status: EventParticipationStatus.waitlisted,
                        hostApprovalStatus: EventJoinRequestStatus.approved,
                      ),
                    ),
                    viewer: viewerFixture(review: 'approved', waitlisted: true),
                  ),
                ],
              ),
            ),
          ),
        ),
      );
      await tester.pump();

      await tester.tap(find.text('Request to join'));
      await tester.pump();

      expect(find.text('Withdraw request'), findsOneWidget);
      expect(find.text('Join approved event'), findsOneWidget);
      expect(fakeEventRepository.joinedWaitlistEventId, 'event-1');

      await tester.tap(find.text('Join approved event'));
      await tester.pump();

      expect(fakePaymentRepository.bookFreeEventCalled, isTrue);
      expect(fakePaymentRepository.bookedFreeEventId, 'event-1');
    });

    testWidgets('renders attended and past states', (tester) async {
      final pastStart = DateTime.now().subtract(const Duration(hours: 2));

      await pumpEventsTestApp(
        tester,
        Scaffold(
          body: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              _withCurrentViewer(
                EventDetailDock(
                  event: buildEvent(
                    startTime: pastStart,
                    endTime: pastStart.add(const Duration(hours: 1)),
                    checkedInCount: 1,
                  ),
                  clubId: 'club1',
                  userProfile: buildUser(),
                  participation: _participation(
                    status: EventParticipationStatus.attended,
                  ),
                ),
                viewer: viewerFixture(
                  reason: 'past',
                  admission: 'nativeParticipation',
                  attendance: 'attended',
                ),
              ),
              _withCurrentViewer(
                EventDetailDock(
                  event: buildEvent(
                    startTime: DateTime.now().subtract(
                      const Duration(hours: 2),
                    ),
                    endTime: DateTime.now().subtract(const Duration(hours: 1)),
                  ),
                  clubId: 'club1',
                  userProfile: buildUser(),
                  participation: null,
                ),
                viewer: viewerFixture(reason: 'past'),
              ),
            ],
          ),
        ),
        overrides: [
          organizersRepositoryProvider.overrideWithValue(
            FakeOrganizersRepository(),
          ),
          paymentRepositoryProvider.overrideWithValue(FakePaymentRepository()),
        ],
      );

      expect(find.text('You attended this event'), findsOneWidget);
      expect(find.text('This event has ended'), findsOneWidget);
    });

    testWidgets('does not show attended state before the event starts', (
      tester,
    ) async {
      final now = DateTime(2026, 5, 13, 19);
      final futureStart = DateTime(2026, 5, 14, 3, 10);

      await pumpEventsTestApp(
        tester,
        Scaffold(
          bottomNavigationBar: _withCurrentViewer(
            EventDetailDock(
              event: buildEvent(
                startTime: futureStart,
                endTime: futureStart.add(const Duration(hours: 1)),
                bookedCount: 9,
                checkedInCount: 1,
              ),
              clubId: 'club1',
              now: now,
              userProfile: buildUser(),
              participation: _participation(
                status: EventParticipationStatus.attended,
              ),
            ),
            viewer: viewerFixture(
              admission: 'nativeParticipation',
              attendance: 'attended',
            ),
          ),
        ),
        overrides: [
          organizersRepositoryProvider.overrideWithValue(
            FakeOrganizersRepository(),
          ),
          paymentRepositoryProvider.overrideWithValue(FakePaymentRepository()),
        ],
      );

      expect(find.text('You attended this event'), findsNothing);
      expect(find.text('Completed'), findsNothing);
      expect(find.text('Cancel booking'), findsOneWidget);
    });

    testWidgets('renders ineligible ages and waitlistable cohort caps', (
      tester,
    ) async {
      final tooYoungUser = buildUser(
        dateOfBirth: DateTime.now().subtract(const Duration(days: 365 * 16)),
      );
      final olderUser = buildUser(
        uid: 'runner-2',
        dateOfBirth: DateTime.now().subtract(const Duration(days: 365 * 45)),
      );

      await pumpEventsTestApp(
        tester,
        Scaffold(
          body: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              _withCurrentViewer(
                EventDetailDock(
                  event: buildEvent(
                    constraints: const EventConstraints(minAge: 18),
                  ),
                  clubId: 'club1',
                  userProfile: tooYoungUser,
                  participation: null,
                ),
                viewer: viewerFixture(reason: 'ageRestricted'),
              ),
              _withCurrentViewer(
                EventDetailDock(
                  event: buildEvent(
                    constraints: const EventConstraints(maxAge: 40),
                  ),
                  clubId: 'club1',
                  userProfile: olderUser,
                  participation: null,
                ),
                viewer: viewerFixture(reason: 'ageRestricted'),
              ),
              _withCurrentViewer(
                EventDetailDock(
                  event: buildEvent(
                    constraints: const EventConstraints(maxMen: 1),
                    genderCounts: const {'man': 1},
                  ),
                  clubId: 'club1',
                  userProfile: buildUser(uid: 'runner-3'),
                  participation: null,
                ),
                viewer: viewerFixture(reason: 'cohortCapacityUnavailable'),
              ),
            ],
          ),
        ),
        overrides: [
          organizersRepositoryProvider.overrideWithValue(
            FakeOrganizersRepository(),
          ),
          paymentRepositoryProvider.overrideWithValue(FakePaymentRepository()),
        ],
      );

      expect(find.text('Must be 18+ to join'), findsOneWidget);
      expect(find.text('Must be 40 or younger'), findsOneWidget);
      expect(find.text('Join waitlist'), findsOneWidget);
    });
  });
}

EventParticipation _participation({
  String eventId = 'event-1',
  String uid = 'runner-1',
  EventParticipationStatus status = EventParticipationStatus.signedUp,
  EventJoinRequestStatus? hostApprovalStatus,
  EventWaitlistOfferStatus? waitlistOfferStatus,
  DateTime? waitlistOfferExpiresAt,
  String? waitlistOfferId,
}) {
  final now = DateTime(2026);
  return EventParticipation(
    id: eventParticipationId(eventId: eventId, uid: uid),
    eventId: eventId,
    clubId: 'club-1',
    uid: uid,
    status: status,
    createdAt: now,
    updatedAt: now,
    hostApprovalStatus: hostApprovalStatus,
    waitlistOfferStatus: waitlistOfferStatus,
    waitlistOfferExpiresAt: waitlistOfferExpiresAt,
    waitlistOfferId: waitlistOfferId,
  );
}

/// Each synthetic actor has its own Auth/current-read scope, including cases
/// that show several event states side by side. No local policy grants access.
Widget _withCurrentViewer(
  EventDetailDock child, {
  required EventViewerState viewer,
}) => ProviderScope(
  overrides: [
    // These test-only scopes isolate synthetic actors, not app dependencies.
    // ignore: riverpod_lint/scoped_providers_should_specify_dependencies
    uidProvider.overrideWithValue(AsyncData(child.userProfile.uid)),
    // ignore: riverpod_lint/scoped_providers_should_specify_dependencies
    eventViewerStateProvider(
      child.event.id,
      child.userProfile.uid,
      inviteCode: child.inviteCode,
    ).overrideWithValue(AsyncData(viewer)),
  ],
  child: child,
);
