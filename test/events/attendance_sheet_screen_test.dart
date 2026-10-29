import 'dart:async';

import 'package:catch_dating_app/contexts/bookings/data/event_participation_repository.dart';
import 'package:catch_dating_app/contexts/bookings/domain/event_participation.dart';
import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event_policy.dart';
import 'package:catch_dating_app/contexts/profiles/data/public_profile_repository.dart';
import 'package:catch_dating_app/core/external_share.dart';
import 'package:catch_dating_app/events/shared/attendance_sheet_view_model.dart';
import 'package:catch_dating_app/hosts/presentation/host_event_action_keys.dart';
import 'package:catch_dating_app/hosts/presentation/host_event_booking_controller.dart';
import 'package:catch_dating_app/hosts/presentation/widgets/host_event_participants_section.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:share_plus/share_plus.dart';

import '../test_pump_helpers.dart';
import 'events_test_helpers.dart';

void main() {
  testWidgets('live mode keeps an empty roster inside the check-in board', (
    tester,
  ) async {
    final event = buildEvent();

    await pumpEventsTestApp(
      tester,
      Scaffold(
        body: HostEventParticipantsSection(
          mode: HostEventParticipantsMode.live,
          eventId: event.id,
        ),
      ),
      overrides: [
        watchEventProvider(event.id).overrideWith((ref) => Stream.value(event)),
        watchEventParticipationsForEventProvider(
          event.id,
        ).overrideWith((ref) => Stream.value(const [])),
      ],
    );
    await _settleAttendanceSheet(tester);
    expect(find.text('CHECK-IN BOARD'), findsOneWidget);
    expect(find.text('All'), findsOneWidget);
    expect(find.text('Due'), findsOneWidget);
    expect(find.text('In'), findsOneWidget);
    expect(find.text('Waitlist'), findsOneWidget);
    expect(find.text('GUEST'), findsOneWidget);
    expect(find.text('STATUS'), findsOneWidget);
    expect(find.text('HOST ACTION'), findsOneWidget);
    expect(find.text('No attendees yet'), findsNothing);
    expect(
      find.text('Signed-up participants will appear here when they book.'),
      findsOneWidget,
    );
  });

  testWidgets('setup mode keeps an empty roster inside the table', (
    tester,
  ) async {
    final event = buildEvent();

    await pumpEventsTestApp(
      tester,
      Scaffold(
        body: HostEventParticipantsSection(
          eventId: event.id,
          mode: HostEventParticipantsMode.setup,
        ),
      ),
      overrides: [
        watchEventProvider(event.id).overrideWith((ref) => Stream.value(event)),
        watchEventParticipationsForEventProvider(
          event.id,
        ).overrideWith((ref) => Stream.value(const [])),
      ],
    );
    await _settleAttendanceSheet(tester);

    expect(find.text('PARTICIPATION'), findsOneWidget);
    expect(find.text('ALL'), findsOneWidget);
    expect(find.text('BOOKED'), findsOneWidget);
    expect(find.text('WAITLIST'), findsOneWidget);
    expect(find.text('SLOTS'), findsOneWidget);
    expect(find.text('GUEST'), findsOneWidget);
    expect(find.text('SIGNAL'), findsOneWidget);
    expect(find.text('HOST ACTION'), findsOneWidget);
    expect(find.text('No participants yet'), findsOneWidget);
    expect(
      find.text('Booked and waitlisted people will appear here.'),
      findsOneWidget,
    );
  });

  testWidgets('report mode keeps an empty roster inside the table', (
    tester,
  ) async {
    final event = buildEvent();

    await pumpEventsTestApp(
      tester,
      Scaffold(
        body: HostEventParticipantsSection(
          eventId: event.id,
          mode: HostEventParticipantsMode.report,
        ),
      ),
      overrides: [
        watchEventProvider(event.id).overrideWith((ref) => Stream.value(event)),
        watchEventParticipationsForEventProvider(
          event.id,
        ).overrideWith((ref) => Stream.value(const [])),
      ],
    );
    await _settleAttendanceSheet(tester);

    expect(find.text('EVENT REPORT'), findsOneWidget);
    expect(find.text('All'), findsOneWidget);
    expect(find.text('Attended'), findsOneWidget);
    expect(find.text('No-show'), findsOneWidget);
    expect(find.text('Waitlist'), findsOneWidget);
    expect(find.text('NAME'), findsNothing);
    expect(find.text('ATTENDANCE'), findsNothing);
    expect(find.text('PAYMENT'), findsNothing);
    expect(find.text('No participants yet'), findsOneWidget);
    expect(
      find.text(
        'Attendance and waitlist history will appear here once people sign up.',
      ),
      findsOneWidget,
    );
  });

  testWidgets('report export buttons share revenue and ops CSV files', (
    tester,
  ) async {
    final event = buildEvent(
      id: 'report-export-event',
      startTime: DateTime(2026, 5, 25, 18),
      priceInPaise: 40000,
    );
    final participationRepository = FakeEventParticipationRepository();
    final publicProfileRepository = FakePublicProfileRepository()
      ..profiles = [
        buildPublicProfile(name: 'Asha'),
        buildPublicProfile(uid: 'runner-2', name: 'Kabir'),
        buildPublicProfile(uid: 'runner-3', name: 'Meera'),
        buildPublicProfile(uid: 'runner-4', name: 'Zara'),
      ];
    participationRepository.eventParticipations[event.id] = [
      buildEventParticipation(
        event: event,
        uid: 'runner-1',
        status: EventParticipationStatus.attended,
        paymentId: 'pay_1',
      ),
      buildEventParticipation(
        event: event,
        uid: 'runner-2',
        paymentId: 'pay_2',
      ),
      buildEventParticipation(
        event: event,
        uid: 'runner-3',
        status: EventParticipationStatus.cancelled,
        paymentId: 'pay_3',
      ),
      buildEventParticipation(
        event: event,
        uid: 'runner-4',
        status: EventParticipationStatus.waitlisted,
        waitlistOfferStatus: EventWaitlistOfferStatus.active,
        waitlistOfferedAt: DateTime(2026, 5, 6, 8),
        waitlistOfferExpiresAt: DateTime(2026, 5, 6, 9),
      ),
    ];
    final shares = <ShareParams>[];

    await pumpEventsTestApp(
      tester,
      Scaffold(
        body: HostEventParticipantsSection(
          eventId: event.id,
          mode: HostEventParticipantsMode.report,
        ),
      ),
      overrides: [
        watchEventProvider(event.id).overrideWith((ref) => Stream.value(event)),
        eventParticipationRepositoryProvider.overrideWith(
          (ref) => participationRepository,
        ),
        publicProfileRepositoryProvider.overrideWith(
          (ref) => publicProfileRepository,
        ),
        externalShareLauncherProvider.overrideWithValue((params) async {
          shares.add(params);
        }),
      ],
    );
    await _settleAttendanceSheet(tester);

    await tester.tap(find.byTooltip('Export report'));
    await _settleAttendanceSheet(tester);
    await tester.tap(find.text('Revenue CSV'));
    await _settleAttendanceSheet(tester);

    expect(shares.single.fileNameOverrides, [
      'monday-evening-run-2026-05-25-revenue.csv',
    ]);
    final revenueCsv = await shares.single.files!.single.readAsString();
    expect(revenueCsv, contains('TOTAL_ESTIMATED_ACTIVE_REVENUE'));
    expect(revenueCsv, contains('Asha,runner-1,attended,checked_in'));
    expect(revenueCsv, contains('Meera,runner-3,cancelled,cancelled'));
    expect(find.text('Revenue CSV ready.'), findsOneWidget);
    await tester.tap(find.byTooltip('Dismiss'));
    await _settleAttendanceSheet(tester);

    await tester.tap(find.byTooltip('Export report'));
    await _settleAttendanceSheet(tester);
    await tester.tap(find.text('Ops CSV'));
    await _settleAttendanceSheet(tester);

    expect(shares.last.fileNameOverrides, [
      'monday-evening-run-2026-05-25-ops.csv',
    ]);
    final opsCsv = await shares.last.files!.single.readAsString();
    expect(opsCsv, contains('arrival_order'));
    expect(opsCsv, contains('Kabir,runner-2,signedUp,not_checked_in'));
    expect(opsCsv, contains('waitlist_offer_status'));
    expect(opsCsv, contains('Zara,runner-4,waitlisted,waitlisted,,active'));
  });

  testWidgets('shows branded loading while attendance data loads', (
    tester,
  ) async {
    final event = buildEvent();
    final participations = StreamController<List<EventParticipation>>();
    addTearDown(participations.close);

    await pumpEventsTestApp(
      tester,
      Scaffold(
        body: HostEventParticipantsSection(
          mode: HostEventParticipantsMode.live,
          eventId: event.id,
        ),
      ),
      overrides: [
        watchEventProvider(event.id).overrideWith((ref) => Stream.value(event)),
        watchEventParticipationsForEventProvider(
          event.id,
        ).overrideWith((ref) => participations.stream),
      ],
    );

    expect(find.byType(CatchSkeleton), findsNothing);
    expect(find.byType(CircularProgressIndicator), findsOneWidget);
  });

  testWidgets('shows branded error when attendance data fails', (tester) async {
    final event = buildEvent();

    await pumpEventsTestApp(
      tester,
      Scaffold(
        body: HostEventParticipantsSection(
          mode: HostEventParticipantsMode.live,
          eventId: event.id,
        ),
      ),
      overrides: [
        attendanceSheetViewModelProvider(
          event.id,
        ).overrideWithValue(AsyncError(Exception('failed'), StackTrace.empty)),
      ],
    );
    await _settleAttendanceSheet(tester);

    expect(find.text('Event unavailable'), findsOneWidget);
    expect(find.text('Reload event'), findsOneWidget);
  });

  testWidgets('renders attendee profiles and toggles attendance', (
    tester,
  ) async {
    final event = buildEvent(id: 'attendance-event');
    final fakeEventRepository = FakeEventRepository();
    final fakePublicProfileRepository = FakePublicProfileRepository()
      ..profiles = [
        buildPublicProfile(name: 'Asha'),
        buildPublicProfile(uid: 'runner-2', name: 'Kabir'),
        buildPublicProfile(uid: 'runner-3', name: 'Meera'),
      ];

    await pumpEventsTestApp(
      tester,
      Scaffold(
        body: SingleChildScrollView(
          // The panel is embedded in the event workspace's scroll owner.
          child: HostEventParticipantsSection(
            mode: HostEventParticipantsMode.live,
            eventId: event.id,
          ),
        ),
      ),
      overrides: [
        watchEventProvider(event.id).overrideWith((ref) => Stream.value(event)),
        watchEventParticipationsForEventProvider(event.id).overrideWith(
          (ref) => Stream.value([
            buildEventParticipation(
              event: event,
              uid: 'runner-1',
              createdAt: DateTime(2026, 5, 6, 7, 1),
            ),
            buildEventParticipation(
              event: event,
              uid: 'runner-2',
              status: EventParticipationStatus.attended,
              createdAt: DateTime(2026, 5, 6, 7, 2),
            ),
            buildEventParticipation(
              event: event,
              uid: 'runner-3',
              status: EventParticipationStatus.waitlisted,
              createdAt: DateTime(2026, 5, 6, 7, 3),
            ),
          ]),
        ),
        eventRepositoryProvider.overrideWith((ref) => fakeEventRepository),
        publicProfileRepositoryProvider.overrideWith(
          (ref) => fakePublicProfileRepository,
        ),
      ],
      signedInUid: 'host-1',
    );
    await _settleAttendanceSheet(tester);

    expect(fakePublicProfileRepository.lastRequestedUids, [
      'runner-1',
      'runner-2',
      'runner-3',
    ]);
    expect(find.text('CHECK-IN BOARD'), findsOneWidget);
    expect(find.text('GUEST'), findsOneWidget);
    expect(find.text('STATUS'), findsOneWidget);
    expect(find.text('HOST ACTION'), findsOneWidget);
    expect(find.text('Asha'), findsOneWidget);
    expect(find.text('Kabir'), findsOneWidget);
    expect(find.text('Meera'), findsOneWidget);
    expect(find.text('Due'), findsWidgets);
    expect(find.text('In'), findsWidgets);
    expect(find.text('WAITLIST'), findsOneWidget);
    expect(find.text('Check in'), findsOneWidget);
    expect(find.text('Undo'), findsOneWidget);

    await tester.tap(find.text('Check in'));
    await tester.pump();

    expect(fakeEventRepository.markedAttendanceEventId, 'attendance-event');
    expect(fakeEventRepository.markedAttendanceUserId, 'runner-1');
  });

  testWidgets('live mode scopes attendance pending state to one row', (
    tester,
  ) async {
    final event = buildEvent(id: 'attendance-cardinality-event');
    final fakePublicProfileRepository = FakePublicProfileRepository()
      ..profiles = [
        buildPublicProfile(name: 'Asha'),
        buildPublicProfile(uid: 'runner-2', name: 'Kabir'),
      ];

    await pumpEventsTestApp(
      tester,
      Scaffold(
        body: _PendingHostAttendanceMutation(
          eventId: event.id,
          uid: 'runner-1',
          child: HostEventParticipantsSection(
            eventId: event.id,
            mode: HostEventParticipantsMode.live,
          ),
        ),
      ),
      overrides: [
        watchEventProvider(event.id).overrideWith((ref) => Stream.value(event)),
        watchEventParticipationsForEventProvider(event.id).overrideWith(
          (ref) => Stream.value([
            buildEventParticipation(event: event, uid: 'runner-1'),
            buildEventParticipation(event: event, uid: 'runner-2'),
          ]),
        ),
        publicProfileRepositoryProvider.overrideWith(
          (ref) => fakePublicProfileRepository,
        ),
      ],
      signedInUid: 'host-1',
    );
    await _settleAttendanceSheet(tester);
    await tester.pump();

    final firstButton = tester.widget<CatchButton>(
      find.byKey(HostEventActionKeys.attendeeCheckInButton('runner-1')),
    );
    final secondButton = tester.widget<CatchButton>(
      find.byKey(HostEventActionKeys.attendeeCheckInButton('runner-2')),
    );

    expect(firstButton.onPressed, isNull);
    expect(secondButton.onPressed, isNotNull);
  });

  testWidgets('participants setup mode shows booked and waitlisted actions', (
    tester,
  ) async {
    final event = buildEvent(id: 'participants-event');
    final fakeEventRepository = FakeEventRepository();
    final fakePublicProfileRepository = FakePublicProfileRepository()
      ..profiles = [
        buildPublicProfile(name: 'Asha'),
        buildPublicProfile(uid: 'runner-2', name: 'Meera'),
      ];

    await pumpEventsTestApp(
      tester,
      Scaffold(
        body: HostEventParticipantsSection(
          eventId: event.id,
          mode: HostEventParticipantsMode.setup,
        ),
      ),
      overrides: [
        watchEventProvider(event.id).overrideWith((ref) => Stream.value(event)),
        watchEventParticipationsForEventProvider(event.id).overrideWith(
          (ref) => Stream.value([
            buildEventParticipation(event: event, uid: 'runner-1'),
            buildEventParticipation(
              event: event,
              uid: 'runner-2',
              status: EventParticipationStatus.waitlisted,
            ),
          ]),
        ),
        eventRepositoryProvider.overrideWith((ref) => fakeEventRepository),
        publicProfileRepositoryProvider.overrideWith(
          (ref) => fakePublicProfileRepository,
        ),
      ],
      signedInUid: 'host-1',
    );
    await _settleAttendanceSheet(tester);

    expect(find.text('PARTICIPATION'), findsOneWidget);
    expect(find.text('Asha'), findsOneWidget);
    expect(find.text('Meera'), findsOneWidget);
    expect(find.text('Booked'), findsWidgets);
    expect(find.text('Wait'), findsOneWidget);
    expect(find.text('Offer'), findsOneWidget);
    expect(find.text('Profile'), findsWidgets);

    await tester.tap(find.text('Offer'));
    await tester.pump();

    expect(
      fakeEventRepository.createdWaitlistOfferEventId,
      'participants-event',
    );
    expect(fakeEventRepository.createdWaitlistOfferUserIds, ['runner-2']);

    await tester.tap(find.text('Asha'));
    await tester.pump();

    expect(fakeEventRepository.markedAttendanceEventId, isNull);
    expect(fakeEventRepository.markedAttendanceUserId, isNull);
  });

  testWidgets('participants setup mode offers the next open waitlist spots', (
    tester,
  ) async {
    final event = buildEvent(id: 'bulk-offer-event', capacityLimit: 3);
    final fakeEventRepository = FakeEventRepository();
    final fakePublicProfileRepository = FakePublicProfileRepository()
      ..profiles = [
        buildPublicProfile(name: 'Asha'),
        buildPublicProfile(uid: 'runner-2', name: 'Meera'),
        buildPublicProfile(uid: 'runner-3', name: 'Kabir'),
        buildPublicProfile(uid: 'runner-4', name: 'Zara'),
      ];

    await pumpEventsTestApp(
      tester,
      Scaffold(
        // Embedded panels delegate scrolling to the roster drawer's ListView.
        body: ListView(
          children: [
            HostEventParticipantsSection(
              eventId: event.id,
              mode: HostEventParticipantsMode.setup,
            ),
          ],
        ),
      ),
      overrides: [
        watchEventProvider(event.id).overrideWith((ref) => Stream.value(event)),
        watchEventParticipationsForEventProvider(event.id).overrideWith(
          (ref) => Stream.value([
            buildEventParticipation(event: event, uid: 'runner-1'),
            buildEventParticipation(
              event: event,
              uid: 'runner-2',
              status: EventParticipationStatus.waitlisted,
            ),
            buildEventParticipation(
              event: event,
              uid: 'runner-3',
              status: EventParticipationStatus.waitlisted,
            ),
            buildEventParticipation(
              event: event,
              uid: 'runner-4',
              status: EventParticipationStatus.waitlisted,
            ),
          ]),
        ),
        eventRepositoryProvider.overrideWith((ref) => fakeEventRepository),
        publicProfileRepositoryProvider.overrideWith(
          (ref) => fakePublicProfileRepository,
        ),
      ],
      signedInUid: 'host-1',
    );
    await _settleAttendanceSheet(tester);

    expect(find.text('Offer next 2'), findsOneWidget);
    expect(tester.takeException(), isNull);

    await tester.tap(find.text('Offer next 2'));
    await tester.pump();

    expect(fakeEventRepository.createdWaitlistOfferEventId, 'bulk-offer-event');
    expect(fakeEventRepository.createdWaitlistOfferUserIds, [
      'runner-2',
      'runner-3',
    ]);
  });

  testWidgets('participants setup mode labels manual approvals as requests', (
    tester,
  ) async {
    final event = buildEvent(
      id: 'request-event',
      eventPolicy: EventPolicyBundle.requestToJoinEvent(
        capacityLimit: 12,
        basePriceInPaise: 0,
      ),
    );
    final fakeEventRepository = FakeEventRepository();
    final fakePublicProfileRepository = FakePublicProfileRepository()
      ..profiles = [buildPublicProfile(uid: 'runner-2', name: 'Meera')];

    await pumpEventsTestApp(
      tester,
      Scaffold(
        body: HostEventParticipantsSection(
          eventId: event.id,
          mode: HostEventParticipantsMode.setup,
        ),
      ),
      overrides: [
        watchEventProvider(event.id).overrideWith((ref) => Stream.value(event)),
        watchEventParticipationsForEventProvider(event.id).overrideWith(
          (ref) => Stream.value([
            buildEventParticipation(
              event: event,
              uid: 'runner-2',
              status: EventParticipationStatus.waitlisted,
            ),
          ]),
        ),
        publicProfileRepositoryProvider.overrideWith(
          (ref) => fakePublicProfileRepository,
        ),
        eventRepositoryProvider.overrideWith((ref) => fakeEventRepository),
      ],
      signedInUid: 'host-1',
    );
    await _settleAttendanceSheet(tester);

    expect(find.text('REQUESTS'), findsWidgets);
    expect(find.text('Request'), findsOneWidget);
    expect(find.text('VIEW PROFILE'), findsOneWidget);

    await tester.tap(find.bySemanticsLabel('Approve request'));
    await tester.pump();

    expect(fakeEventRepository.decidedJoinRequestEventId, 'request-event');
    expect(fakeEventRepository.decidedJoinRequestUserId, 'runner-2');
    expect(fakeEventRepository.decidedJoinRequestDecision, 'approve');

    await tester.tap(find.bySemanticsLabel('Decline request'));
    await tester.pump();

    expect(fakeEventRepository.decidedJoinRequestEventId, 'request-event');
    expect(fakeEventRepository.decidedJoinRequestUserId, 'runner-2');
    expect(fakeEventRepository.decidedJoinRequestDecision, 'decline');
  });
}

Future<void> _settleAttendanceSheet(WidgetTester tester) =>
    pumpFeatureUi(tester);

class _PendingHostAttendanceMutation extends ConsumerStatefulWidget {
  const _PendingHostAttendanceMutation({
    required this.eventId,
    required this.uid,
    required this.child,
  });

  final String eventId;
  final String uid;
  final Widget child;

  @override
  ConsumerState<_PendingHostAttendanceMutation> createState() =>
      _PendingHostAttendanceMutationState();
}

class _PendingHostAttendanceMutationState
    extends ConsumerState<_PendingHostAttendanceMutation> {
  final Completer<void> _completer = Completer<void>();
  bool _started = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || _started) return;
      _started = true;
      final mutation = HostEventBookingController.markAttendanceMutation(
        HostEventBookingController.markAttendanceMutationKey(
          eventId: widget.eventId,
          userId: widget.uid,
        ),
      );
      unawaited(mutation.run(ref, (_) => _completer.future));
    });
  }

  @override
  Widget build(BuildContext context) => widget.child;
}
