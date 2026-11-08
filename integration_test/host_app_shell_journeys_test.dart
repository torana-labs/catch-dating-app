import 'package:catch_dating_app/contexts/bookings/domain/event_attendee.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/event_success/presentation/host_components/event_success_live_workspace_tab_bar.dart';
import 'package:catch_dating_app/hosts/create/create_basics_screen.dart';
import 'package:catch_dating_app/hosts/create/create_tickets_screen.dart';
import 'package:catch_dating_app/hosts/create/create_when_screen.dart';
import 'package:catch_dating_app/hosts/events/events_screen.dart';
import 'package:catch_dating_app/hosts/organizer/organizer_screen.dart';
import 'package:catch_dating_app/hosts/people/messages_screen.dart';
import 'package:catch_dating_app/hosts/people/people_screen.dart';
import 'package:catch_dating_app/hosts/presentation/host_organizer_selection_controller.dart';
import 'package:catch_dating_app/hosts/today/host_today_screen.dart';
import 'package:catch_dating_app/routing/shell/app_shell_keys.dart';
import 'package:catch_dating_app/routing/shell/host_shell_navigation.dart';
import 'package:catch_dating_app/routing/shell/host_shell_screen.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../test/events/events_test_helpers.dart' as event_helpers;
import '../test/organizers/organizers_test_helpers.dart' as organizer_helpers;
import '../test/support/profile_readiness_fixtures.dart';
import 'support/app_shell_test_binding.dart';
import 'support/app_shell_test_harness.dart';
import 'support/app_shell_workflow_steps.dart';
import 'support/host_app_shell_test_harness.dart';

const _hostUid = 'host-journey-user';

final _saketRunClub = organizer_helpers.buildOrganizer(
  id: 'host-journey-saket',
  name: 'Saket Run Club',
  hostUserId: _hostUid,
  ownerUserId: _hostUid,
);
final _lodhiSocials = organizer_helpers.buildOrganizer(
  id: 'host-journey-lodhi',
  name: 'Lodhi Socials',
  hostUserId: _hostUid,
  ownerUserId: _hostUid,
);

/// Signed-in Catch Host journeys through the real Host router
/// (`apps/host` installs `MyApp(routerProvider: hostGoRouterProvider)`).
void main() {
  ensureAppShellTestBinding();

  testWidgets('signed-in Host boots the Host shell on Today', (tester) async {
    final backend = _returningHostBackend();
    await _pumpHost(tester, backend, organizers: [_saketRunClub]);

    expect(find.byType(HostShellScreen), findsOneWidget);
    expect(find.byType(HostTodayScreen), findsOneWidget);
    for (final label in _hostTabs.keys) {
      expect(
        find.descendant(
          of: find.byKey(AppShellKeys.navigationBar),
          matching: find.bySemanticsLabel(RegExp('^$label')),
        ),
        findsOneWidget,
        reason: 'Host navigation must expose $label.',
      );
    }
    expect(_navigation(tester).items.last.semanticValue, _saketRunClub.name);
    // Today listens to its attention queue in Firestore; booting the shell
    // makes no attention callable.
    expect(
      backend.functions.calls.where(
        (call) => call.name.toLowerCase().contains('attention'),
      ),
      isEmpty,
    );
    expectHostSurfaceLoaded(tester, backend, surface: 'Host boot');
    await unmountHostAppShell(tester);
  });

  testWidgets('a Host with nothing scheduled sees the day on Today', (
    tester,
  ) async {
    final backend = HostShellBackend(uid: _hostUid);
    await _pumpHost(tester, backend, organizers: [_saketRunClub]);

    expect(find.byType(HostTodayScreen, skipOffstage: false), findsOneWidget);
    expect(find.text('Needs you'), findsOneWidget);
    expect(find.text('This week'), findsOneWidget);
    expect(find.text('Nothing else on this week.'), findsOneWidget);
    expect(find.widgetWithText(CatchButton, 'New event'), findsWidgets);
    expectHostSurfaceLoaded(tester, backend, surface: 'first-launch Today');
    await unmountHostAppShell(tester);
  });

  testWidgets('every Host tab loads without an error state', (tester) async {
    final backend = _returningHostBackend();
    await _pumpHost(tester, backend, organizers: [_saketRunClub]);

    for (final MapEntry(key: label, value: screen) in _hostTabs.entries) {
      await openHostTab(tester, label);
      await pumpAppShellFrames(tester, frames: 20);
      expect(
        find.byType(screen, skipOffstage: false),
        findsOneWidget,
        reason: '$label root screen',
      );
      expectHostSurfaceLoaded(tester, backend, surface: '$label tab');
    }
    await unmountHostAppShell(tester);
  });

  testWidgets('the inbox opens under People and keeps its path', (
    tester,
  ) async {
    final backend = _returningHostBackend();
    await _pumpHost(
      tester,
      backend,
      organizers: [_saketRunClub],
      initialRoute: '/host/inbox',
    );

    expect(
      find.byType(HostMessagesScreen, skipOffstage: false),
      findsOneWidget,
    );
    expect(_navigation(tester).active, HostShellDestination.people);
    expectHostSurfaceLoaded(tester, backend, surface: 'People inbox');
    await unmountHostAppShell(tester);
  });

  testWidgets('Host without an organizer creates one and lands on it', (
    tester,
  ) async {
    final backend = HostShellBackend(uid: _hostUid);
    await _pumpHost(tester, backend, organizers: const []);
    expect(find.text('Create your first organizer'), findsOneWidget);

    await tapCatchButton(tester, 'Create organizer');
    expect(find.text('Start your page'), findsOneWidget);
    await _enterKeyed(tester, 'host-setup-name', 'Lodhi Garden Socials');
    await tester.ensureVisible(_chip('Mumbai'));
    await tester.tap(_chip('Mumbai'));
    await pumpAppShellFrames(tester);
    await _enterKeyed(tester, 'host-setup-area', 'Lodhi Colony');
    await tapCatchButton(tester, 'Next');

    expect(find.text('Check your details'), findsOneWidget);
    await _enterKeyed(
      tester,
      'host-setup-description',
      'Sunday walks, long lunches.',
    );
    // Next on Details creates the page.
    await tapCatchButton(tester, 'Next');
    await pumpAppShellFrames(tester, frames: 30);
    await tapCatchButton(tester, 'Skip for now');
    await pumpAppShellFrames(tester, frames: 30);
    await tester.tap(find.byTooltip('Close'));
    await pumpAppShellFrames(tester, frames: 30);

    final create = backend.functions.calls.singleWhere(
      (call) => call.name == 'createOrganizer',
    );
    expect(create.input, containsPair('name', 'Lodhi Garden Socials'));
    expect(find.byType(HostTodayScreen, skipOffstage: false), findsOneWidget);
    expect(find.text('Create your first organizer'), findsNothing);
    expect(
      _navigation(tester).items.last.semanticValue,
      'Lodhi Garden Socials',
    );
    expectHostSurfaceLoaded(tester, backend, surface: 'new organizer Today');
    await unmountHostAppShell(tester);
  });

  testWidgets('Host switches organizers and tabs read the selected one', (
    tester,
  ) async {
    final backend = HostShellBackend(uid: _hostUid);
    await _pumpHost(
      tester,
      backend,
      organizers: [_saketRunClub, _lodhiSocials],
    );
    final selected = _selectedOrganizerId(tester);
    final other = selected == _saketRunClub.id ? _lodhiSocials : _saketRunClub;

    await tester.longPress(
      find.descendant(
        of: find.byKey(AppShellKeys.navigationBar),
        matching: find.bySemanticsLabel(RegExp('^Organizer')),
      ),
    );
    await pumpSheet(tester);
    expect(
      find.byKey(const ValueKey<String>('host-organizer-switcher-sheet')),
      findsOneWidget,
    );
    await tester.tap(find.byKey(ValueKey<Object?>(other.id)));
    await pumpAppShellFrames(tester, frames: 20);
    expect(_selectedOrganizerId(tester), other.id);

    final before = backend.functions.calls.length;
    await openHostTab(tester, 'Events');
    await pumpAppShellFrames(tester, frames: 20);
    final eventReads = backend.functions.calls.skip(before).toList();
    expect(eventReads, isNotEmpty);
    expect(
      eventReads.map((call) => (call.input! as Map)['organizerId']).toSet(),
      {other.id},
    );
    expectHostSurfaceLoaded(tester, backend, surface: 'switched Events');
    await unmountHostAppShell(tester);
  });

  testWidgets('Host creates a private event and reopens it', (tester) async {
    final backend = HostShellBackend(uid: _hostUid);
    await _pumpHost(tester, backend, organizers: [_saketRunClub]);

    await openHostTab(tester, 'Events');
    await pumpAppShellFrames(tester, frames: 20);
    await tapCatchButton(tester, 'New');
    await pumpAppShellFrames(tester, frames: 30);
    expect(find.byType(CreateBasicsScreen), findsOneWidget);
    await tester.enterText(
      find.descendant(
        of: find.byKey(const ValueKey('create-name')),
        matching: find.byType(EditableText),
      ),
      'Rooftop supper club',
    );
    await tester.tap(find.byKey(const ValueKey('create-format-supper')));
    await pumpAppShellFrames(tester);
    await tester.tap(find.text('Next'));
    await pumpAppShellFrames(tester, frames: 20);

    expect(find.byType(CreateWhenScreen), findsOneWidget);
    final tomorrow = DateTime.now().add(const Duration(days: 1));
    await tester.tap(find.byKey(ValueKey('create-day-${tomorrow.day}')));
    await pumpAppShellFrames(tester);
    await tester.tap(find.byKey(const ValueKey('create-starts')));
    await pumpAppShellFrames(tester);
    await tester.tap(find.text('OK'));
    await pumpAppShellFrames(tester);
    await tester.tap(find.text('Next'));
    await pumpAppShellFrames(tester, frames: 40);

    // The create command, then the details command for the format and the
    // length, both through the setup commands; the steps move on to tickets.
    final eventId = backend.privateEvents.keys.single;
    expect(
      backend.functions.calls.map((call) => call.name),
      containsAllInOrder([
        'createPrivateEventSetup',
        'updatePrivateEventDetails',
      ]),
    );
    expect(find.byType(CreateTicketsScreen), findsOneWidget);

    // Back walks the steps; Close on the first returns to the Events tab,
    // whose upcoming list listens to the saved event.
    await tester.tap(find.byTooltip('Back'));
    await pumpAppShellFrames(tester);
    await tester.tap(find.byTooltip('Back'));
    await pumpAppShellFrames(tester);
    await tester.tap(find.byTooltip('Close'));
    await pumpAppShellFrames(tester, frames: 30);
    expect(find.byType(CreateBasicsScreen), findsNothing);
    expect(find.text('Rooftop supper club'), findsWidgets);
    final reopenFrom = backend.functions.calls.length;
    await tester.tap(find.byKey(ValueKey('host-events-draft-$eventId')));
    await pumpAppShellFrames(tester, frames: 30);

    expect(find.byType(CreateBasicsScreen), findsOneWidget);
    expect(find.text('Rooftop supper club'), findsWidgets);
    // The saved event comes from its setup view listener, not a callable.
    expect(
      backend.functions.calls.skip(reopenFrom).map((call) => call.input),
      isNot(
        anyElement(
          equals({'organizerId': _saketRunClub.id, 'eventId': eventId}),
        ),
      ),
    );
    expectHostSurfaceLoaded(tester, backend, surface: 'reopened event');
    await unmountHostAppShell(tester);
  });

  testWidgets('Host opens the guest list and checks a guest in', (
    tester,
  ) async {
    final backend = HostShellBackend(uid: _hostUid);
    final now = DateTime.now();
    final event = event_helpers.buildEvent(
      id: 'host-journey-live-event',
      organizerId: _saketRunClub.id,
      name: 'Sunset social run',
      startTime: now.subtract(const Duration(minutes: 10)),
      endTime: now.add(const Duration(hours: 2)),
    );
    await backend.seedPublishedEvent(event);
    for (final (id, name) in const [
      ('guest-asha', 'Asha Rao'),
      ('guest-dev', 'Dev Mehta'),
    ]) {
      await backend.seedAttendee(
        EventAttendee(
          id: id,
          eventId: event.id,
          organizerId: _saketRunClub.id,
          displayName: name,
          searchName: name.toLowerCase(),
          source: EventAttendeeSource.hostImport,
          status: EventAttendeeStatus.registered,
          createdAt: now,
          updatedAt: now,
        ),
      );
    }
    await _pumpHost(
      tester,
      backend,
      organizers: [_saketRunClub],
      initialRoute: '/host/events',
    );

    await tester.tap(find.byKey(ValueKey('host-events-tonight-${event.id}')));
    await pumpAppShellFrames(tester, frames: 30);
    // The event workspace opens the door, which is the guest list.
    await tester.tap(find.byKey(const ValueKey('host-event-ready-door')));
    await pumpAppShellFrames(tester, frames: 30);
    expect(find.text('Asha Rao'), findsOneWidget);
    expect(find.text('Dev Mehta'), findsOneWidget);
    expect(find.text('0 of 2 in'), findsOneWidget);

    // The Guests tab is the door: Check in is the row action.
    await tester.tap(
      find.descendant(
        of: find.byKey(const ValueKey('door-guest-guest-asha')),
        matching: find.text('Check in'),
      ),
    );
    await pumpAppShellFrames(tester, frames: 30);

    final checkIn = backend.functions.calls.singleWhere(
      (call) => call.name == 'setEventAttendeeAttendance',
    );
    expect(checkIn.input, containsPair('attendeeId', 'guest-asha'));
    expect(checkIn.input, containsPair('desiredCheckedIn', true));
    final stored = await backend.firestore
        .collection('eventAttendees')
        .doc('guest-asha')
        .get();
    expect(stored.data()?['status'], EventAttendeeStatus.checkedIn.name);
    expect(find.text('1 of 2 in'), findsOneWidget);
    expectHostSurfaceLoaded(tester, backend, surface: 'guest roster');
    await unmountHostAppShell(tester);
  });

  testWidgets('Host opens the door and checks a guest in', (tester) async {
    final backend = HostShellBackend(uid: _hostUid);
    final now = DateTime.now();
    final event = event_helpers.buildEvent(
      id: 'host-journey-door-event',
      organizerId: _saketRunClub.id,
      name: 'Door social run',
      startTime: now.subtract(const Duration(minutes: 10)),
      endTime: now.add(const Duration(hours: 2)),
    );
    await backend.seedPublishedEvent(event);
    for (final (id, name) in const [
      ('door-asha', 'Asha Rao'),
      ('door-dev', 'Dev Mehta'),
    ]) {
      await backend.seedAttendee(
        EventAttendee(
          id: id,
          eventId: event.id,
          organizerId: _saketRunClub.id,
          displayName: name,
          searchName: name.toLowerCase(),
          source: EventAttendeeSource.hostImport,
          status: EventAttendeeStatus.registered,
          createdAt: now,
          updatedAt: now,
        ),
      );
    }
    await _pumpHost(
      tester,
      backend,
      organizers: [_saketRunClub],
      initialRoute:
          '/host/organizers/${_saketRunClub.id}/events/${event.id}/guests',
    );
    await pumpAppShellFrames(tester, frames: 30);

    expect(find.text('0 of 2 in'), findsOneWidget);
    expect(find.text('Asha Rao'), findsOneWidget);
    expect(find.text('Dev Mehta'), findsOneWidget);

    await tester.tap(
      find.descendant(
        of: find.byKey(const ValueKey('door-guest-door-asha')),
        matching: find.text('Check in'),
      ),
    );
    await pumpAppShellFrames(tester, frames: 30);

    final checkIn = backend.functions.calls.singleWhere(
      (call) => call.name == 'setEventAttendeeAttendance',
    );
    expect(checkIn.input, containsPair('attendeeId', 'door-asha'));
    expect(checkIn.input, containsPair('desiredCheckedIn', true));
    expect(find.text('1 of 2 in'), findsOneWidget);
    expect(find.text('Asha Rao'), findsNothing);
    expectHostSurfaceLoaded(tester, backend, surface: 'door');
    await unmountHostAppShell(tester);
  });

  testWidgets('Host settings offer Delete your account', (tester) async {
    final backend = HostShellBackend(uid: _hostUid);
    await _pumpHost(tester, backend, organizers: [_saketRunClub]);

    await openHostTab(tester, 'Organizer');
    await pumpAppShellFrames(tester, frames: 20);
    final settings = find.byKey(const ValueKey('organizer-row-settings'));
    await tester.ensureVisible(settings);
    await pumpAppShellFrames(tester);
    await tester.tap(settings);
    await pumpAppShellFrames(tester, frames: 20);
    final delete = find.byKey(const ValueKey('settings-row-delete'));
    await tester.ensureVisible(delete);
    await tester.tap(delete);
    await pumpSheet(tester);
    expect(find.textContaining('Shared business records'), findsOneWidget);
    await tester.tap(find.text('Cancel'));
    await pumpSheet(tester);
    expect(delete, findsOneWidget);
    await unmountHostAppShell(tester);
  });
}

const _hostTabs = <String, Type>{
  'Today': HostTodayScreen,
  'Events': HostEventsTabScreen,
  'People': HostPeopleScreen,
  'Organizer': OrganizerScreen,
};

/// A Host who already dismissed the first-run Today focus prompt.
HostShellBackend _returningHostBackend() => HostShellBackend(uid: _hostUid)
  ..todayPreferences.skip(accountId: _hostUid, organizerId: _saketRunClub.id);

Future<void> _pumpHost(
  WidgetTester tester,
  HostShellBackend backend, {
  required List<Organizer> organizers,
  String initialRoute = '/host/today',
}) async {
  await pumpHostAppShell(
    tester,
    initialRoute: initialRoute,
    overrides: await hostAppShellTestOverrides(
      backend: backend,
      user: buildSocialReadyUser(uid: _hostUid),
      organizers: organizers,
    ),
  );
  await pumpAppShellFrames(tester, frames: 20);
}

CatchTabBar<HostShellDestination> _navigation(WidgetTester tester) =>
    tester.widget<CatchTabBar<HostShellDestination>>(
      find.byKey(AppShellKeys.navigationBar),
    );

String? _selectedOrganizerId(WidgetTester tester) => ProviderScope.containerOf(
  tester.element(find.byType(HostShellScreen)),
).read(hostOrganizerSelectionProvider(_hostUid));

Finder _chip(String label) => find.byWidgetPredicate(
  (widget) => widget is CatchChip && widget.label == label,
);

Future<void> _enterKeyed(WidgetTester tester, String key, String text) async {
  final field = find.descendant(
    of: find.byKey(ValueKey<String>(key)),
    matching: find.byType(EditableText),
  );
  await tester.ensureVisible(field);
  await tester.enterText(field, text);
  tester.testTextInput.hide();
  await tester.pump();
}
