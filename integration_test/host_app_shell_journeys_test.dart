import 'package:catch_dating_app/contexts/bookings/domain/event_attendee.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/event_success/presentation/host_components/event_success_live_workspace_tab_bar.dart';
import 'package:catch_dating_app/hosts/events/presentation/host_event_entry_sheet.dart';
import 'package:catch_dating_app/hosts/presentation/customers/host_customers_screen.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/private_event_setup_screen.dart';
import 'package:catch_dating_app/hosts/presentation/host_operations_screen.dart';
import 'package:catch_dating_app/hosts/presentation/host_organizer_selection_controller.dart';
import 'package:catch_dating_app/hosts/presentation/inbox/host_inbox_screen.dart';
import 'package:catch_dating_app/hosts/today/presentation/host_today_screen.dart';
import 'package:catch_dating_app/routing/shell/app_shell_keys.dart';
import 'package:catch_dating_app/routing/shell/host_app_shell.dart';
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

    expect(find.byType(HostAppShell), findsOneWidget);
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
    expect(
      find.byKey(const ValueKey<String>('host-organizer-navigation-avatar')),
      findsOneWidget,
    );
    final firstRead = backend.functions.calls.first;
    expect(firstRead.name, 'listOrganizerAttentionItems');
    expect(firstRead.input, {'organizerId': _saketRunClub.id});
    expectHostSurfaceLoaded(tester, backend, surface: 'Host boot');
    await unmountHostAppShell(tester);
  });

  testWidgets('first-launch Host is asked for a Today focus', (tester) async {
    final backend = HostShellBackend(uid: _hostUid);
    await _pumpHost(tester, backend, organizers: [_saketRunClub]);

    expect(find.text('What would you like to work on?'), findsOneWidget);
    expect(find.widgetWithText(CatchButton, 'Explore for now'), findsOneWidget);
    expect(find.byType(HostTodayScreen, skipOffstage: false), findsOneWidget);
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

  testWidgets('Host without an organizer creates one and lands on it', (
    tester,
  ) async {
    final backend = HostShellBackend(uid: _hostUid);
    await _pumpHost(tester, backend, organizers: const []);
    expect(find.text('Create your first organizer'), findsOneWidget);

    await tapCatchButton(tester, 'Create organizer');
    await _enterField(tester, 'Organizer name', 'Lodhi Garden Socials');
    await _enterField(tester, 'Area / neighbourhood', 'Lodhi Colony');
    await tester.ensureVisible(_field('City'));
    await tester.tap(_field('City'));
    await pumpAppShellFrames(tester);
    await tester.tap(_chip('Mumbai'));
    await pumpAppShellFrames(tester);
    await tapCatchButton(tester, 'Next');
    await _enterField(tester, 'Description', 'Sunday walks, long lunches.');
    await tapCatchButton(tester, 'Next');
    await tapCatchButton(tester, 'Next');
    await tapCatchButton(tester, 'Review organizer');
    await tapCatchButton(tester, 'Create organizer');
    await pumpAppShellFrames(tester, frames: 30);

    final create = backend.functions.calls.singleWhere(
      (call) => call.name == 'createOrganizer',
    );
    expect(create.input, containsPair('name', 'Lodhi Garden Socials'));
    expect(find.byType(HostTodayScreen, skipOffstage: false), findsOneWidget);
    expect(find.text('Create your first organizer'), findsNothing);
    expect(
      find.byKey(const ValueKey<String>('host-organizer-navigation-avatar')),
      findsOneWidget,
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
    await tapCatchButton(tester, 'Create event');
    await tester.tap(
      find.descendant(
        of: find.byType(HostEventEntrySheet),
        matching: find.text('Create event'),
      ),
    );
    await pumpAppShellFrames(tester, frames: 30);
    await tester.enterText(
      find.descendant(
        of: find.byKey(const ValueKey('private-event-name')),
        matching: find.byType(EditableText),
      ),
      'Rooftop supper club',
    );
    await _pickFirstOfNextMonth(tester, const ValueKey('private-event-date'));
    await tester.tap(find.byKey(const ValueKey('private-event-start')));
    await pumpAppShellFrames(tester);
    await tester.tap(find.text('OK'));
    await pumpAppShellFrames(tester);
    await tester.ensureVisible(
      find.byKey(const ValueKey('private-event-save')),
    );
    await tester.tap(find.byKey(const ValueKey('private-event-save')));
    await pumpAppShellFrames(tester, frames: 30);

    final eventId = backend.privateEvents.keys.single;
    expect(find.byType(PrivateEventSetupScreen), findsOneWidget);
    expect(find.text('Rooftop supper club'), findsWidgets);
    expect(find.text('Private'), findsOneWidget);

    // Back returns to the Events list kept mounted across the create flow. It
    // re-reads the private inventory, so the new event is listed at once.
    final backFrom = backend.functions.calls.length;
    await tester.tap(find.byTooltip('Back'));
    await pumpAppShellFrames(tester, frames: 30);
    expect(find.byType(PrivateEventSetupScreen), findsNothing);
    expect(
      backend.functions.calls
          .skip(backFrom)
          .where((call) => call.name == 'listPrivateEventSetups')
          .map((call) => (call.input! as Map)['scope']),
      contains('upcoming'),
    );
    expect(find.text('Rooftop supper club'), findsWidgets);
    final reopenFrom = backend.functions.calls.length;
    await tester.tap(find.byKey(ValueKey('host-event-row-$eventId')));
    await pumpAppShellFrames(tester, frames: 30);

    expect(find.byType(PrivateEventSetupScreen), findsOneWidget);
    expect(find.text('Rooftop supper club'), findsWidgets);
    expect(
      backend.functions.calls.skip(reopenFrom).map((call) => call.input),
      anyElement(equals({'organizerId': _saketRunClub.id, 'eventId': eventId})),
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

    await tester.tap(find.byKey(ValueKey('host-event-row-${event.id}')));
    await pumpAppShellFrames(tester, frames: 30);
    await tester.tap(
      find.descendant(
        of: find.byType(EventSuccessLiveWorkspaceTabBar),
        matching: find.text('Guests'),
      ),
    );
    await pumpAppShellFrames(tester, frames: 30);
    expect(find.text('Asha Rao'), findsOneWidget);
    expect(find.text('Dev Mehta'), findsOneWidget);
    expect(find.widgetWithText(CatchButton, 'Check in'), findsNWidgets(2));

    await tester.tap(
      find.descendant(
        of: find.byKey(const ValueKey('guest-asha')),
        matching: find.widgetWithText(CatchButton, 'Check in'),
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
    expect(find.text('Checked in'), findsOneWidget);
    expect(find.widgetWithText(CatchButton, 'Undo'), findsOneWidget);
    expectHostSurfaceLoaded(tester, backend, surface: 'guest roster');
    await unmountHostAppShell(tester);
  });

  testWidgets('Host account menu offers Delete account', (tester) async {
    final backend = HostShellBackend(uid: _hostUid);
    await _pumpHost(tester, backend, organizers: [_saketRunClub]);

    await openHostTab(tester, 'Organizer');
    await pumpAppShellFrames(tester, frames: 20);
    await tester.tap(find.byKey(const ValueKey('host-account-menu')));
    await pumpSheet(tester);
    expect(find.text('Delete account'), findsOneWidget);

    await tester.tap(find.text('Delete account'));
    await pumpSheet(tester);
    expect(find.textContaining('Shared business records'), findsOneWidget);
    await tester.tap(find.text('Cancel'));
    await pumpSheet(tester);
    expect(find.byKey(const ValueKey('host-account-menu')), findsOneWidget);
    await unmountHostAppShell(tester);
  });
}

const _hostTabs = <String, Type>{
  'Today': HostTodayScreen,
  'Events': HostEventsScreen,
  'Audience': HostCustomersScreen,
  'Inbox': HostInboxScreen,
  'Organizer': HostOrganizersScreen,
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

String? _selectedOrganizerId(WidgetTester tester) => ProviderScope.containerOf(
  tester.element(find.byType(HostAppShell)),
).read(hostOrganizerSelectionProvider(_hostUid));

Finder _field(String title) => find.byWidgetPredicate(
  (widget) => widget is CatchField && widget.title == title,
);

Finder _chip(String label) => find.byWidgetPredicate(
  (widget) => widget is CatchChip && widget.label == label,
);

Future<void> _enterField(WidgetTester tester, String title, String text) async {
  await tester.enterText(
    find.descendant(of: _field(title), matching: find.byType(EditableText)),
    text,
  );
  tester.testTextInput.hide();
  await tester.pump();
}

Future<void> _pickFirstOfNextMonth(WidgetTester tester, Key field) async {
  await tester.tap(find.byKey(field));
  await pumpAppShellFrames(tester);
  await tester.tap(find.byTooltip('Next month'));
  await pumpAppShellFrames(tester);
  await tester.tap(find.text('1').hitTestable());
  await pumpAppShellFrames(tester);
  await tester.tap(find.text('OK'));
  await pumpAppShellFrames(tester);
}
