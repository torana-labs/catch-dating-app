import 'package:catch_dating_app/contexts/organizers/data/organizers_repository.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/hosts/create/create_route_screen.dart';
import 'package:catch_dating_app/hosts/create/create_screen.dart';
import 'package:catch_platform/catch_async_state.dart';
import 'package:catch_test_support/events_test_helpers.dart';
import 'package:catch_test_support/test_pump_helpers.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  group('createRouteStatus', () {
    final organizer = buildOrganizer();
    CreateRouteStatus status({
      HostCreateEventRouteArguments arguments =
          const HostCreateEventRouteArguments(),
      CatchAsyncState<Organizer?>? organizerState,
      CatchAsyncState<String?> uid = const CatchAsyncState.data('host-1'),
    }) => createRouteStatus(
      organizerId: 'club-1',
      arguments: arguments,
      organizer: organizerState ?? CatchAsyncState<Organizer?>.data(organizer),
      uid: uid,
    );

    test('maps the organizer read and the signed-in host', () {
      expect(
        status(organizerState: const CatchAsyncState<Organizer?>.loading()),
        CreateRouteStatus.loading,
      );
      expect(
        status(uid: const CatchAsyncState<String?>.loading()),
        CreateRouteStatus.loading,
      );
      expect(
        status(
          organizerState: CatchAsyncState<Organizer?>.error(StateError('x')),
        ),
        CreateRouteStatus.error,
      );
      expect(
        status(organizerState: const CatchAsyncState<Organizer?>.data(null)),
        CreateRouteStatus.notFound,
      );
      expect(
        status(uid: const CatchAsyncState.data('guest-1')),
        CreateRouteStatus.forbidden,
      );
      expect(status(), CreateRouteStatus.ready);
    });

    test('refuses a start that belongs to another organizer', () {
      expect(
        status(
          arguments: HostCreateEventRouteArguments(
            initialOrganizer: buildOrganizer(id: 'other-organizer'),
          ),
        ),
        CreateRouteStatus.mismatch,
      );
    });
  });

  group('CreateRouteScreen', () {
    setUp(() => SharedPreferences.setMockInitialValues({}));

    testWidgets('blocks users outside the organizer host team', (tester) async {
      await pumpEventsTestApp(
        tester,
        CreateRouteScreen(
          organizerId: 'club-1',
          arguments: HostCreateEventRouteArguments(
            initialOrganizer: buildOrganizer(),
          ),
        ),
      );
      await tester.pump();

      expect(find.text('Host access required'), findsOneWidget);
      expect(find.byType(CreateScreen), findsNothing);
    });

    testWidgets('opens the create flow from a passed-in organizer', (
      tester,
    ) async {
      final organizer = buildOrganizer(id: 'club-extra');
      await pumpEventsTestApp(
        tester,
        CreateRouteScreen(
          organizerId: organizer.id,
          arguments: HostCreateEventRouteArguments(initialOrganizer: organizer),
        ),
        overrides: [
          watchOrganizerProvider(
            organizer.id,
          ).overrideWithValue(const AsyncLoading<Organizer?>()),
        ],
        signedInUid: 'host-1',
      );
      await pumpFeatureUi(tester);

      expect(find.byType(CreateScreen), findsOneWidget);
      expect(find.text('Host access required'), findsNothing);
    });

    testWidgets('refuses an organizer that disagrees with the path', (
      tester,
    ) async {
      await pumpEventsTestApp(
        tester,
        CreateRouteScreen(
          organizerId: 'path-organizer',
          arguments: HostCreateEventRouteArguments(
            initialOrganizer: buildOrganizer(id: 'extra-organizer'),
          ),
        ),
        signedInUid: 'host-1',
      );
      await tester.pump();

      expect(find.text('Event setup unavailable'), findsOneWidget);
      expect(
        find.text('That organizer does not match this event route.'),
        findsOneWidget,
      );
    });
  });
}
