import 'dart:io';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/organizers/data/organizers_repository.dart';
import 'package:catch_dating_app/design_fixtures/host_operations_fixtures.dart';
import 'package:catch_dating_app/hosts/events/event_close_out_controller.dart';
import 'package:catch_dating_app/hosts/events/event_close_out_screen.dart';
import 'package:catch_dating_app/hosts/events/event_guests_controller.dart';
import 'package:catch_dating_app/hosts/events/event_guests_screen.dart';
import 'package:catch_dating_app/hosts/events/event_plan_controller.dart';
import 'package:catch_dating_app/hosts/events/event_plan_screen.dart';
import 'package:catch_dating_app/hosts/events/event_workspace_controller.dart';
import 'package:catch_dating_app/hosts/events/event_workspace_screen.dart';
import 'package:catch_dating_app/hosts/events/events_controller.dart';
import 'package:catch_dating_app/hosts/events/events_screen.dart';
import 'package:catch_dating_app/hosts/events/rehearsal_controller.dart';
import 'package:catch_dating_app/hosts/events/rehearsal_screen.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../support/catch_test_fonts.dart';
import '../../ui_captures/support/capture_device.dart';
import '../../ui_captures/support/capture_pump.dart';
import 'events_fixtures.dart';

/// Phone captures of the events screens for review. They run only with
/// EVENTS_CAPTURE_DIRECTORY set; each screen is answered by its fixture.
void main() {
  const directory = String.fromEnvironment('EVENTS_CAPTURE_DIRECTORY');
  if (directory.isEmpty) return;
  setUpAll(loadCatchTestFonts);

  final organizer = HostOperationsFixtures.primaryOrganizer;
  final uid = organizer.hostUserId!;
  final request = HostEventRequest(
    organizerId: organizer.id,
    eventId: tonightEvent.id,
  );
  final shared = [
    uidProvider.overrideWith((ref) => Stream.value(uid)),
    hostOperableOrganizersProvider(
      uid,
    ).overrideWithValue(AsyncData([organizer])),
    fetchOrganizerProvider(organizer.id).overrideWith((ref) async => organizer),
    hostEventsControllerProvider(
      HostEventsRequest(organizerId: organizer.id, now: eventsNow),
    ).overrideWithValue(eventsReady()),
    hostEventWorkspaceControllerProvider(
      request,
    ).overrideWithValue(workspaceReady()),
    hostEventGuestsControllerProvider(request).overrideWithValue(guestsReady()),
    hostEventCloseOutControllerProvider(
      request,
    ).overrideWithValue(closeOutReady()),
    hostEventPlanControllerProvider(request).overrideWithValue(planReady()),
    hostRehearsalControllerProvider(
      'session-1',
    ).overrideWithValue(rehearsalReady()),
  ];

  final screens = <String, WidgetBuilder>{
    'host-events': (_) => HostEventsTabScreen(now: eventsNow),
    'host-event-workspace': (_) => HostEventWorkspaceScreen(
      organizerId: organizer.id,
      eventId: tonightEvent.id,
      now: eventsNow,
    ),
    'host-event-guests': (_) => HostEventGuestsScreen(request: request),
    'host-event-close-out': (_) => HostEventCloseOutScreen(request: request),
    'host-event-plan': (_) => HostEventPlanScreen(request: request),
    'host-event-rehearsal': (_) =>
        HostRehearsalScreen(organizerId: organizer.id, sessionId: 'session-1'),
  };

  for (final MapEntry(key: id, value: builder) in screens.entries) {
    testWidgets('capture $id', (tester) async {
      await captureCatchWidget(
        tester,
        id: id,
        device: CaptureDevice.claudePhone390,
        outputDirectory: Directory(directory),
        providerOverrides: shared,
        builder: builder,
      );
    });
  }
}
