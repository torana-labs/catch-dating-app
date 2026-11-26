import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/bookings/data/event_attendee_repository.dart';
import 'package:catch_dating_app/contexts/bookings/data/event_staff_presence_repository.dart';
import 'package:catch_dating_app/contexts/bookings/data/host_attendance_outbox.dart';
import 'package:catch_dating_app/contexts/bookings/domain/event_attendee.dart';
import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/organizers/data/host_event_staff_repository.dart';
import 'package:catch_dating_app/hosts/door/door_screen.dart';
import 'package:catch_dating_app/hosts/presentation/host_operational_roster_controller.dart';
import 'package:catch_dating_app/hosts/programmes/staff/staff_event_screen.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/device/connectivity_service.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:catch_platform/riverpod_ui/catch_localized_error_state.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

const _eventId = 'quiz-night';

HostEventOperatorAccess _access({
  String status = 'active',
  Set<HostEventOperatorPermission> permissions = const {
    HostEventOperatorPermission.viewRoster,
  },
}) => HostEventOperatorAccess(
  eventId: _eventId,
  organizerId: 'org-1',
  title: 'Quiz night',
  startAt: DateTime(2026, 11, 28, 19),
  endAt: DateTime(2026, 11, 28, 22),
  eventStatus: status,
  actorRole: HostEventOperatorRole.operator,
  permissions: permissions,
  grantExpiresAt: DateTime(2026, 11, 29, 1),
);

/// The attendance outbox on a fake that holds nothing.
class _EmptyRoster implements HostOperationalRosterController {
  @override
  Future<HostAttendanceOutboxSummary> loadAttendanceOutbox(String eventId) =>
      Future.value(const HostAttendanceOutboxSummary([]));

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

Future<void> _pump(
  WidgetTester tester,
  Future<HostEventOperatorAccess> Function() access,
) async {
  tester.view.physicalSize = const Size(390, 1400);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.reset);
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        hostEventOperatorAccessProvider(
          _eventId,
        ).overrideWith((ref) => access()),
        watchEventAttendeesProvider(
          _eventId,
        ).overrideWith((ref) => const Stream<List<EventAttendee>>.empty()),
        watchEventProvider(_eventId).overrideWith((ref) => Stream.value(null)),
        watchEventStaffPresenceProvider(
          _eventId,
        ).overrideWith((ref) => Stream.value(const [])),
        uidProvider.overrideWith((ref) => Stream.value('staff-1')),
        hostOperationalRosterControllerProvider.overrideWithValue(
          _EmptyRoster(),
        ),
        appConnectivityProvider.overrideWith(
          (ref) => Stream.value(const [ConnectivityResult.wifi]),
        ),
      ],
      child: const MaterialApp(
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
        home: StaffEventScreen(eventId: _eventId),
      ),
    ),
  );
  await tester.pump();
  await tester.pump();
}

void main() {
  testWidgets('an active grant opens the door limited to the grant', (
    tester,
  ) async {
    await _pump(
      tester,
      () async => _access(
        permissions: const {
          HostEventOperatorPermission.viewRoster,
          HostEventOperatorPermission.setAttendance,
        },
      ),
    );

    final door = tester.widget<DoorScreen>(find.byType(DoorScreen));
    expect(door.organizerId, 'org-1');
    expect(door.access.checkIn, isTrue);
    expect(door.access.reviewClaims, isFalse);
    expect(door.access.manage, isFalse);
    expect(door.access.role, HostEventOperatorRole.operator);
    expect(door.access.until, DateTime(2026, 11, 29, 1));

    // Lets the door go, with its heartbeat timer.
    await tester.pumpWidget(const SizedBox.shrink());
  });

  testWidgets('a cancelled event says so instead of opening the door', (
    tester,
  ) async {
    await _pump(tester, () async => _access(status: 'cancelled'));

    expect(find.byType(DoorScreen), findsNothing);
    expect(find.text('Quiz night'), findsOneWidget);
    expect(find.text('This event was cancelled'), findsOneWidget);
    expect(
      find.text(
        'Its roster can no longer be changed from the staff workspace.',
      ),
      findsOneWidget,
    );
  });

  testWidgets('no access shows the error with a retry', (tester) async {
    await _pump(
      tester,
      () async => throw const PermissionException(
        'This account does not have active event-operator access.',
      ),
    );

    expect(find.byType(DoorScreen), findsNothing);
    expect(find.byKey(const ValueKey('staff-event-screen')), findsOneWidget);
    expect(find.byType(CatchLocalizedErrorState), findsOneWidget);
  });

  testWidgets('loading shows the indicator', (tester) async {
    final pending = Completer<HostEventOperatorAccess>();
    await _pump(tester, () => pending.future);

    expect(find.byType(DoorScreen), findsNothing);
    expect(find.byType(CatchLoadingIndicator), findsOneWidget);
  });
}
